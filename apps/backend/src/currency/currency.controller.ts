import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { SetFallbackRateDto } from './dto/set-fallback-rate.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';

@Controller()
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @UseGuards(JwtAuthGuard)
  @Get('currency/fallback')
  getFallbackRates() {
    return this.currencyService.getFallbackRates();
  }

  @UseGuards(JwtAuthGuard)
  @Post('currency/fallback')
  setFallbackRatePost(@Body() dto: SetFallbackRateDto) {
    return this.currencyService.setFallbackRate(
      dto.base_currency,
      dto.target_currency,
      dto.rate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/exchange-rates')
  getAdminExchangeRates() {
    return this.currencyService.getFallbackRates();
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/exchange-rates')
  setAdminExchangeRates(@Body() dto: SetFallbackRateDto) {
    return this.currencyService.setFallbackRate(
      dto.base_currency,
      dto.target_currency,
      dto.rate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('currency/convert')
  async convert(
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const numericAmount = parseFloat(amount) || 0;
    const converted = await this.currencyService.convert(
      numericAmount,
      from || 'USD',
      to || 'USD',
    );
    return {
      amount: numericAmount,
      from: (from || 'USD').toUpperCase(),
      to: (to || 'USD').toUpperCase(),
      converted,
    };
  }
}
