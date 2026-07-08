import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

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

  async create(data: { username: string; email: string; password: string }) {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    console.log(`Updating user #${id}:`, updateUserDto);
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
