import {
  Controller,
  Get,
  Param,
  HttpCode,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubscriptionHistoryService } from './subscription-history.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionHistoryController {
  constructor(
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
  ) {}

  @Get(':id/history')
  @HttpCode(200)
  findBySubscription(
    @Param('id') id: string,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.subscriptionHistoryService.findBySubscription(id, req.user.id);
  }
}
