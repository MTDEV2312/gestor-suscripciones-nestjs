import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { CurrencyModule } from 'src/currency/currency.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPayment, Subscription]),
    CurrencyModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
