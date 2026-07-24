import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { Subscription } from './entities/subscription.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { SubscriptionHistoryModule } from 'src/subscription-history/subscription-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Tag]),
    UsersModule,
    SubscriptionHistoryModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

