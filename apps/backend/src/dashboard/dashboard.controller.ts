import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  DashboardInfo(@Request() req: Request & { user: AuthUser }) {
    return this.dashboardService.dashboard(req);
  }
}
