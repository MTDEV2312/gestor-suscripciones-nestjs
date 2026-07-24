import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionHistory } from './entities/subscription-history.entity';
import { SubscriptionHistoryService } from './subscription-history.service';
import { SubscriptionHistoryController } from './subscription-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionHistory])],
  controllers: [SubscriptionHistoryController],
  providers: [SubscriptionHistoryService],
  exports: [SubscriptionHistoryService],
})
export class SubscriptionHistoryModule {}
