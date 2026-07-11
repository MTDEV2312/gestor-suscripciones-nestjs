import { Module } from '@nestjs/common';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { RenewalScheduler } from './cron-job.scheduler';

@Module({
  imports: [SubscriptionsModule],
  providers: [RenewalScheduler],
})
export class CronJobModule {}
