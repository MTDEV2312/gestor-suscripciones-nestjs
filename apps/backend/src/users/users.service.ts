import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  //User services routes

  async create(data: {
    username: string;
    email: string;
    password: string;
    telegramUsername?: string;
  }) {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findUserInfo(req: { user: AuthUser }) {
    return this.userRepository.findOne({ where: { id: req.user.id } });
  }

  async update(updateUserDto: UpdateUserDto, req: { user: AuthUser }) {
    const user = await this.userRepository.findOne({
      where: { id: req.user.id },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (updateUserDto.username) {
      const usernameExists = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (usernameExists && usernameExists.id !== user.id) {
        throw new NotFoundException('El nombre de usuario ya está en uso');
      }
    }

    if (updateUserDto.email) {
      const emailExists = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (emailExists && emailExists.id !== user.id) {
        throw new NotFoundException('El correo electrónico ya está en uso');
      }
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async remove(req: { user: AuthUser }) {
    const user = await this.userRepository.findOne({
      where: { id: req.user.id },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.userRepository.remove(user);
    return {
      message: 'Usuario eliminado correctamente',
    };
  }
}
