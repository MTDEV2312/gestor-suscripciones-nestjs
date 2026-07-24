import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SubscriptionHistoryModule } from './subscription-history/subscription-history.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { PasswordService } from './security/password.service';
import { SecurityModule } from './security/security.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { DashboardModule } from './dashboard/dashboard.module';
import { CronJobModule } from './cron-job/cron-job.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsModule } from './notifications/notifications.module';
import { dataSourceOptions } from './database/data-source';

import { CurrencyModule } from './currency/currency.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
      migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
    }),
    ScheduleModule.forRoot(),
    SubscriptionsModule,
    SubscriptionHistoryModule,
    UsersModule,
    SecurityModule,
    AuthModule,
    DashboardModule,
    CurrencyModule,
    TagsModule,
    CronJobModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PasswordService, NotificationsService],
})
export class AppModule {}

