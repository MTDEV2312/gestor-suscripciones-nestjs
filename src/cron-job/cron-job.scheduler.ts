import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Injectable()
export class RenewalScheduler {
  constructor(
    private readonly subscriptionService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *')
  async checkRenewals() {
    const dueRenewals = await this.subscriptionService.findDueRenewals();
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

      // 1. Enviar notificación consolidada si tiene telegramUsername configurado
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

      // 2. Procesar las renovaciones en base de datos
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
}
