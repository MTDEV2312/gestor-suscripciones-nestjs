import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';

export const MAX_CUSTOM_TAGS_PER_USER = 50;

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  async create(createTagDto: CreateTagDto, req: { user: AuthUser }) {
    const count = await this.tagRepository.count({
      where: { user_id: req.user.id },
    });

    if (count >= MAX_CUSTOM_TAGS_PER_USER) {
      throw new BadRequestException('Límite máximo de 50 etiquetas alcanzado');
    }

    const tag = this.tagRepository.create({
      ...createTagDto,
      color: createTagDto.color || '#6B7280',
      user_id: req.user.id,
    });

    return await this.tagRepository.save(tag);
  }

  async findAll(req: { user: AuthUser }) {
    return await this.tagRepository.find({
      where: { user_id: req.user.id },
    });
  }

  async findOne(id: string, req: { user: AuthUser }) {
    const tag = await this.tagRepository.findOne({
      where: { id, user_id: req.user.id },
    });

    if (!tag) {
      throw new NotFoundException('Etiqueta no encontrada');
    }

    return tag;
  }

  async update(
    id: string,
    updateTagDto: UpdateTagDto,
    req: { user: AuthUser },
  ) {
    const tag = await this.findOne(id, req);
    Object.assign(tag, updateTagDto);
    return await this.tagRepository.save(tag);
  }

  async remove(id: string, req: { user: AuthUser }) {
    const tag = await this.findOne(id, req);
    await this.tagRepository.remove(tag);
    return {
      message: 'Etiqueta eliminada exitosamente',
    };
  }
}
