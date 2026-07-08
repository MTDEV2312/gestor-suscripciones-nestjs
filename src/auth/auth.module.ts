import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { SecurityModule } from 'src/security/security.module';

@Module({
  imports: [UsersModule, SecurityModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
