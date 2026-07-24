import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createTagDto: CreateTagDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.tagsService.create(createTagDto, req);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@Request() req: Request & { user: AuthUser }) {
    return this.tagsService.findAll(req);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('id') id: string,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.tagsService.findOne(id, req);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.tagsService.update(id, updateTagDto, req);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.tagsService.remove(id, req);
  }
}
