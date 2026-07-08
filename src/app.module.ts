import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { PasswordService } from './security/password.service';
import { SecurityModule } from './security/security.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'database.sqlite',
      autoLoadEntities: true,
      synchronize: true,
    }),
    SubscriptionsModule,
    UsersModule,
    SecurityModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, PasswordService],
})
export class AppModule {}
