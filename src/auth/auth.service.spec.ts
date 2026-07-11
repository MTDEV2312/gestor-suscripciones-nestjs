import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { PasswordService } from 'src/security/password.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    create: jest.fn(),
  };

  const mockPasswordService = {
    hashPassword: jest.fn(),
    comparePasswords: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      repeatPassword: 'password123',
    };

    it('should throw BadRequestException if passwords do not match', async () => {
      const invalidDto = {
        ...registerDto,
        repeatPassword: 'differentPassword',
      };
      await expect(service.register(invalidDto)).rejects.toThrow(
        new BadRequestException('Las contraseñas no coinciden'),
      );
    });

    it('should throw BadRequestException if email is already in use', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing-id' });

      await expect(service.register(registerDto)).rejects.toThrow(
        new BadRequestException('El email ya está en uso'),
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
    });

    it('should throw BadRequestException if username is already in use', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue({ id: 'existing-id' });

      await expect(service.register(registerDto)).rejects.toThrow(
        new BadRequestException('El nombre de usuario ya está en uso'),
      );
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith(
        registerDto.username,
      );
    });

    it('should hash password and create user when request is valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue(null);
      mockPasswordService.hashPassword.mockResolvedValue('hashed_password');
      const expectedUser = {
        id: 'new-id',
        username: 'testuser',
        email: 'test@example.com',
      };
      mockUsersService.create.mockResolvedValue(expectedUser);

      const result = await service.register(registerDto);

      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(
        'password123',
      );
      expect(mockUsersService.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed_password',
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should throw UnauthorizedException if user email is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Credenciales inválidas'),
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-id',
        password: 'hashed_password',
      });
      mockPasswordService.comparePasswords.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Credenciales inválidas'),
      );
      expect(mockPasswordService.comparePasswords).toHaveBeenCalledWith(
        'password123',
        'hashed_password',
      );
    });

    it('should sign access token and return token and user info on valid credentials', async () => {
      const mockDbUser = {
        id: 'user-id',
        username: 'testuser',
        password: 'hashed_password',
      };
      mockUsersService.findByEmail.mockResolvedValue(mockDbUser);
      mockPasswordService.comparePasswords.mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('jwt_token');

      const result = await service.login(loginDto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-id',
        username: 'testuser',
      });
      expect(result).toEqual({
        token: 'jwt_token',
        user: {
          id: 'user-id',
          username: 'testuser',
        },
      });
    });
  });
});
