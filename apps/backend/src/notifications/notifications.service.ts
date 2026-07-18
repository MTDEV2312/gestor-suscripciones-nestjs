import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly telegramApiUrl: string;
  private readonly telegramUsername: string;
  private readonly isHtml: string;
  private readonly isLinks: string;
  private readonly logger = new Logger(NotificationsService.name);

  constructor() {
    this.telegramApiUrl = process.env.TELEGRAM_API_URL || '';
    this.telegramUsername = process.env.TELEGRAM_USERNAME || '';
    this.isHtml = process.env.ISHTML || 'yes';
    this.isLinks = process.env.ISLINKS || 'no';
  }
  async sendNotification(
    message: string,
    telegramUsername?: string,
  ): Promise<void> {
    try {
      const recipient = telegramUsername || this.telegramUsername;
      if (!recipient) {
        this.logger.warn('No telegram username provided for notification');
        return;
      }
      const formattedRecipient = recipient.startsWith('@')
        ? recipient
        : `@${recipient}`;
      const url = `${this.telegramApiUrl}user=${formattedRecipient}&text=${encodeURIComponent(message)}&html=${this.isHtml}&links=${this.isLinks}`;
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(
          `Failed to send notification. Status: ${response.status}`,
        );
      }
      this.logger.log(`Notification sent successfully to: ${recipient}`);
    } catch (error) {
      this.logger.error(`Error occurred while sending notification: ${error}`);
    }
  }
}
