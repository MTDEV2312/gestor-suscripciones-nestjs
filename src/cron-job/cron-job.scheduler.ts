import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Injectable()
export class RenewalScheduler {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  @Cron('*/30 * * * * *')
  async checkRenewals() {
    const dueRenewals = await this.subscriptionService.findDueRenewals();

    for (const subscription of dueRenewals) {
      try {
        await this.subscriptionService.processDueRenewals(subscription);
      } catch (error) {
        console.error(`Error renewing subscription ${subscription.id}:`, error);
      }
    }
  }
}
