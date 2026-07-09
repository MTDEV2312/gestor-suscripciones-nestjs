import {
  Controller,
  Body,
  Patch,
  Delete,
  HttpCode,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(200)
  findById(@Request() req: Request & { user: AuthUser }) {
    return this.usersService.findUserInfo(req);
  }

  @Patch()
  @HttpCode(200)
  update(
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.usersService.update(updateUserDto, req);
  }

  @Delete()
  @HttpCode(200)
  remove(@Request() req: Request & { user: AuthUser }) {
    return this.usersService.remove(req);
  }
}
