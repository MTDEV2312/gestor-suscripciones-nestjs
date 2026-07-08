import { BadRequestException, Injectable } from '@nestjs/common';
import { PasswordService } from 'src/security/password.service';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(dto: RegisterDto) {
    // Implementation for registration
    // Validate that password and repeatPassword match
    if (dto.password !== dto.repeatPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const emailExists = await this.usersService.findByEmail(dto.email);
    // Validate that the email is not already in use
    if (emailExists) {
      throw new BadRequestException('El email ya está en uso');
    }

    const usernameExists = await this.usersService.findByUsername(dto.username);
    // Validate that the username is not already in use
    if (usernameExists) {
      throw new BadRequestException('El nombre de usuario ya está en uso');
    }

    // Hash the password before saving the user
    const hashedPassword = await this.passwordService.hashPassword(
      dto.password,
    );

    return this.usersService.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
    });
  }
}
