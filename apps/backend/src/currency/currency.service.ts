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
  private readonly cacheTtlMs = 5 * 24 * 60 * 60 * 1000; // 5 days TTL (432,000,000 ms)

  constructor(
    @InjectRepository(ExchangeRateFallback)
    private readonly fallbackRepo: Repository<ExchangeRateFallback>,
    private readonly configService: ConfigService,
  ) {}

  private async fetchExternalRates(base: string = 'USD'): Promise<Record<string, number>> {
    const now = Date.now();
    // 1. Memory cache check
    if (this.rateCache && this.rateCache.base === base && this.rateCache.expiresAt > now) {
      return this.rateCache.rates;
    }

    // 2. Database cache check (persisted across server restarts)
    const storedRates = await this.fallbackRepo.find({
      where: { base_currency: base },
    });

    if (storedRates.length > 0) {
      const validStoredRates = storedRates.filter((item) => {
        if (!item.last_fetched_at) return false;
        const fetchedAt = new Date(item.last_fetched_at).getTime();
        return now - fetchedAt < this.cacheTtlMs;
      });

      if (validStoredRates.length === storedRates.length && validStoredRates.length > 0) {
        const ratesMap: Record<string, number> = { [base]: 1 };
        let oldestFetchedAt = now;

        for (const item of validStoredRates) {
          ratesMap[item.target_currency] = Number(item.rate);
          const t = new Date(item.last_fetched_at!).getTime();
          if (t < oldestFetchedAt) oldestFetchedAt = t;
        }

        this.rateCache = {
          base,
          rates: ratesMap,
          expiresAt: oldestFetchedAt + this.cacheTtlMs,
        };

        return ratesMap;
      }
    }

    // 3. Fetch fresh rates from Exchange Rate API if DB cache is missing or older than 5 days
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

      const rates: Record<string, number> = data.conversion_rates;
      const fetchDate = new Date();

      this.rateCache = {
        base,
        rates,
        expiresAt: now + this.cacheTtlMs,
      };

      // Persist fresh rates to DB asynchronously with last_fetched_at
      for (const [targetCurr, rateVal] of Object.entries(rates)) {
        if (targetCurr === base) continue;
        let record = await this.fallbackRepo.findOne({
          where: { base_currency: base, target_currency: targetCurr },
        });

        if (record) {
          record.rate = rateVal;
          record.last_fetched_at = fetchDate;
          await this.fallbackRepo.save(record);
        } else {
          record = this.fallbackRepo.create({
            base_currency: base,
            target_currency: targetCurr,
            rate: rateVal,
            last_fetched_at: fetchDate,
          });
          await this.fallbackRepo.save(record);
        }
      }

      return rates;
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
