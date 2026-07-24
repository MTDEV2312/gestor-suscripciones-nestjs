import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  UseGuards,
  Request,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.subscriptionsService.create(createSubscriptionDto, req);
  }

  @Get()
  @HttpCode(200)
  findAll(
    @Request() req: Request & { user: AuthUser },
    @Query('tagId') tagId?: string,
  ) {
    return this.subscriptionsService.findAll(req, tagId);
  }

  @Get(':id')
  @HttpCode(200)
  findOne(
    @Param('id') id: string,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.subscriptionsService.findOne(id, req);
  }

  @Patch(':id')
  @HttpCode(200)
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.subscriptionsService.update(id, updateSubscriptionDto, req);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(
    @Param('id') id: string,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.subscriptionsService.remove(id, req);
  }
}
