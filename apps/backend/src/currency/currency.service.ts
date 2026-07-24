import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ExchangeRateFallback } from './entities/exchange-rate-fallback.entity';

interface RateCache {
  base: string;
  rates: Record<string, number>;
  expiresAt: number;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private rateCache: RateCache | null = null;
  private readonly cacheTtlMs = 60 * 60 * 1000; // 1 hour TTL

  constructor(
    @InjectRepository(ExchangeRateFallback)
    private readonly fallbackRepo: Repository<ExchangeRateFallback>,
    private readonly configService: ConfigService,
  ) {}

  private async fetchExternalRates(base: string = 'USD'): Promise<Record<string, number>> {
    const now = Date.now();
    if (this.rateCache && this.rateCache.base === base && this.rateCache.expiresAt > now) {
      return this.rateCache.rates;
    }

    const apiKey = this.configService.get<string>('EXCHANGERATE_API_KEY');
    if (!apiKey) {
      throw new Error('Exchange rate API key is not configured');
    }

    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      if (data.result !== 'success' || !data.conversion_rates) {
        throw new Error('Invalid rate response structure');
      }

      this.rateCache = {
        base,
        rates: data.conversion_rates,
        expiresAt: now + this.cacheTtlMs,
      };

      return data.conversion_rates;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch exchange rates from external API: ${err.message}`);
      throw new Error('External exchange rate API unavailable');
    }
  }

  private async getFallbackRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    const direct = await this.fallbackRepo.findOne({
      where: {
        base_currency: fromCurrency.toUpperCase(),
        target_currency: toCurrency.toUpperCase(),
      },
    });

    if (direct) {
      return Number(direct.rate);
    }

    const inverted = await this.fallbackRepo.findOne({
      where: {
        base_currency: toCurrency.toUpperCase(),
        target_currency: fromCurrency.toUpperCase(),
      },
    });

    if (inverted && Number(inverted.rate) > 0) {
      return 1 / Number(inverted.rate);
    }

    return null;
  }

  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to || amount === 0) {
      return amount;
    }

    try {
      const rates = await this.fetchExternalRates('USD');
      const fromRate = rates[from];
      const toRate = rates[to];

      if (fromRate && toRate) {
        const converted = amount * (toRate / fromRate);
        return Number(converted.toFixed(4));
      }
    } catch {
      // External API failed, fall back to DB rates
    }

    const fallbackRate = await this.getFallbackRate(from, to);
    if (fallbackRate !== null) {
      const converted = amount * fallbackRate;
      return Number(converted.toFixed(4));
    }

    // If no conversion rate is found at all, return amount unchanged as safe fallback
    return amount;
  }

  async setFallbackRate(
    baseCurrency: string,
    targetCurrency: string,
    rate: number,
  ): Promise<ExchangeRateFallback> {
    const base = baseCurrency.toUpperCase();
    const target = targetCurrency.toUpperCase();

    let existing = await this.fallbackRepo.findOne({
      where: { base_currency: base, target_currency: target },
    });

    if (existing) {
      existing.rate = rate;
      return this.fallbackRepo.save(existing);
    }

    const created = this.fallbackRepo.create({
      base_currency: base,
      target_currency: target,
      rate,
    });
    return this.fallbackRepo.save(created);
  }

  async getFallbackRates(): Promise<ExchangeRateFallback[]> {
    return this.fallbackRepo.find();
  }
}
