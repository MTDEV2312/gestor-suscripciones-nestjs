import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';

@Module({
  imports: [TypeOrmModule.forRoot({
    type: 'better-sqlite3',
    database: 'database.sqlite',
    autoLoadEntities: true,
    synchronize: true,
  }),SubscriptionsModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}