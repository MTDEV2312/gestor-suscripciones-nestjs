import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Injectable()
export class RenewalScheduler {
  private readonly logger = new Logger(RenewalScheduler.name);

  constructor(
    private readonly subscriptionService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *')
  async checkRenewals() {
    this.logger.log('Starting checkRenewals cron job...');

    // 1. Process 7d, 3d, 1d upcoming renewal notifications
    await this.checkUpcomingRenewals(7);
    await this.checkUpcomingRenewals(3);
    await this.checkUpcomingRenewals(1);

    // 2. Process due renewals (today or past due)
    const dueRenewals = await this.subscriptionService.findDueRenewals();
    this.logger.log(
      `Found ${dueRenewals.length} subscriptions due for renewal.`,
    );
    if (dueRenewals.length === 0) {
      return;
    }

    // Agrupar suscripciones vencidas por usuario en memoria
    const groupedByUser = new Map<
      string,
      { telegramUsername?: string; subscriptions: typeof dueRenewals }
    >();

    for (const subscription of dueRenewals) {
      const userKey = subscription.user?.id || subscription.user_id;
      const group = groupedByUser.get(userKey) || {
        telegramUsername: subscription.user?.telegramUsername,
        subscriptions: [],
      };
      group.subscriptions.push(subscription);
      groupedByUser.set(userKey, group);
    }

    // Procesar cada grupo de usuario
    for (const [userId, group] of groupedByUser.entries()) {
      const subs = group.subscriptions;

      // Enviar notificación consolidada si tiene telegramUsername configurado
      if (group.telegramUsername) {
        try {
          let message = `[Gestor Suscripciones] ¡Alerta! Tenés las siguientes renovaciones pendientes:\n`;
          for (const sub of subs) {
            message += `- ${sub.name} el ${sub.next_renewal_date}. Costo: ${sub.price} ${sub.currency}.\n`;
          }
          await this.notificationsService.sendNotification(
            message.trim(),
            group.telegramUsername,
          );
        } catch (error) {
          console.error(
            `Error sending consolidated notification for user ${userId}:`,
            error,
          );
        }
      }

      // Procesar las renovaciones en base de datos
      for (const sub of subs) {
        try {
          await this.subscriptionService.processDueRenewals(sub);
        } catch (error) {
          console.error(
            `Error renewing subscription ${sub.id} for user ${userId}:`,
            error,
          );
        }
      }
    }
  }

  async checkUpcomingRenewals(days: number, baseDate: Date = new Date()) {
    const upcomingSubs = await this.subscriptionService.findRenewalsInDays(
      days,
      baseDate,
    );
    if (!upcomingSubs || upcomingSubs.length === 0) {
      return;
    }

    const groupedByUser = new Map<
      string,
      { telegramUsername?: string; subscriptions: typeof upcomingSubs }
    >();

    for (const subscription of upcomingSubs) {
      const userKey = subscription.user?.id || subscription.user_id;
      const group = groupedByUser.get(userKey) || {
        telegramUsername: subscription.user?.telegramUsername,
        subscriptions: [],
      };
      group.subscriptions.push(subscription);
      groupedByUser.set(userKey, group);
    }

    const title =
      days === 1
        ? '[Gestor Suscripciones] ¡Alerta de cobro inminente! (1 día restante):'
        : `[Gestor Suscripciones] Recordatorio preventivo (${days} días restantes):`;

    for (const [userId, group] of groupedByUser.entries()) {
      if (group.telegramUsername) {
        try {
          let message = `${title}\n`;
          for (const sub of group.subscriptions) {
            message += `- ${sub.name} el ${sub.next_renewal_date}. Costo: ${sub.price} ${sub.currency}.\n`;
          }
          await this.notificationsService.sendNotification(
            message.trim(),
            group.telegramUsername,
          );
        } catch (error) {
          this.logger.error(
            `Error sending ${days}d notification for user ${userId}:`,
            error,
          );
        }
      }
    }
  }
}
