import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { UsersModule } from 'src/users/users.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription]),
    UsersModule,
    SubscriptionsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
