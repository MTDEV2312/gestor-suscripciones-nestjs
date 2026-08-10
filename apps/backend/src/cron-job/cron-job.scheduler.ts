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

  @Cron('0 * * * *')
  async checkRenewals(baseDate: Date = new Date()) {
    const currentHour = baseDate.getHours();
    this.logger.log(`Starting checkRenewals cron job for hour ${currentHour}...`);

    // 1. Process 7d, 3d, 1d upcoming renewal notifications
    await this.checkUpcomingRenewals(7, baseDate);
    await this.checkUpcomingRenewals(3, baseDate);
    await this.checkUpcomingRenewals(1, baseDate);

    // 2. Process due renewals (today or past due)
    const dueRenewals =
      await this.subscriptionService.findDueRenewals(currentHour);
    this.logger.log(
      `Found ${dueRenewals.length} subscriptions due for renewal at hour ${currentHour}.`,
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
          let message = `<b>🚨 Gestor de Suscripciones</b>\n`;
          message += `━━━━━━━━━━━━━━━━━━━━━\n`;
          message += `<b>¡Alerta! Renovaciones pendientes:</b>\n\n`;
          for (const sub of subs) {
            const name = this.notificationsService.escapeHtml(sub.name || '');
            const price = this.notificationsService.escapeHtml(
              String(sub.price ?? ''),
            );
            const currency = this.notificationsService.escapeHtml(
              sub.currency || '',
            );
            const date = this.notificationsService.escapeHtml(
              sub.next_renewal_date || '',
            );
            message += `🚨 <b>${name}</b>\n`;
            message += `💳 Costo: <code>${price} ${currency}</code>\n`;
            message += `📅 Fecha: <i>${date}</i>\n\n`;
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
    const currentHour = baseDate.getHours();
    const upcomingSubs = await this.subscriptionService.findRenewalsInDays(
      days,
      baseDate,
      currentHour,
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

    const headerTitle =
      days === 1
        ? '<b>🚨 Gestor de Suscripciones</b>\n━━━━━━━━━━━━━━━━━━━━━\n<b>¡Alerta de cobro inminente! (1 día restante):</b>'
        : days === 3
        ? '<b>⚠️ Gestor de Suscripciones</b>\n━━━━━━━━━━━━━━━━━━━━━\n<b>Recordatorio preventivo (3 días restantes):</b>'
        : '<b>📅 Gestor de Suscripciones</b>\n━━━━━━━━━━━━━━━━━━━━━\n<b>Recordatorio preventivo (7 días restantes):</b>';

    const itemEmoji = days === 1 ? '🚨' : days === 3 ? '⚠️' : '📅';

    for (const [userId, group] of groupedByUser.entries()) {
      if (group.telegramUsername) {
        try {
          let message = `${headerTitle}\n\n`;
          for (const sub of group.subscriptions) {
            const name = this.notificationsService.escapeHtml(sub.name || '');
            const price = this.notificationsService.escapeHtml(
              String(sub.price ?? ''),
            );
            const currency = this.notificationsService.escapeHtml(
              sub.currency || '',
            );
            const date = this.notificationsService.escapeHtml(
              sub.next_renewal_date || '',
            );
            message += `${itemEmoji} <b>${name}</b>\n`;
            message += `💳 Costo: <code>${price} ${currency}</code>\n`;
            message += `📅 Fecha: <i>${date}</i>\n\n`;
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
