import { Module } from '@nestjs/common';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { RenewalScheduler } from './cron-job.scheduler';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [SubscriptionsModule, NotificationsModule],
  providers: [RenewalScheduler],
})
export class CronJobModule {}
