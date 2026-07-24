import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { ExchangeRateFallback } from './entities/exchange-rate-fallback.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRateFallback])],
  controllers: [CurrencyController],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule {}
