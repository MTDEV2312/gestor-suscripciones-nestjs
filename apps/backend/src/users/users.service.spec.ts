import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PasswordService } from 'src/security/password.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: User = {
    id: 'user-uuid',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    notificationHour: 20,
    createdAt: new Date(),
    updatedAt: new Date(),
    subscriptions: [],
    tags: [],
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockPasswordService = {
    comparePasswords: jest.fn(),
    hashPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should call userRepository.findOne with correct email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findByEmail('test@example.com');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByUsername', () => {
    it('should call userRepository.findOne with correct username', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findByUsername('testuser');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should call userRepository.findOne with correct id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findById('user-uuid');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const data = {
        username: 'new',
        email: 'new@example.com',
        password: 'password',
      };
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(data);
      expect(mockUserRepository.create).toHaveBeenCalledWith(data);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findUserInfo', () => {
    it('should return user info from authenticated request user id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const req = {
        user: {
          id: 'user-uuid',
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      const result = await service.findUserInfo(req);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    const req = {
      user: {
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
      },
    };

    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.update({}, req)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if new username is already taken by another user', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // find original user
        .mockResolvedValueOnce({ id: 'other-id', username: 'taken' }); // find conflicting username

      await expect(service.update({ username: 'taken' }, req)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if new email is already taken by another user', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // find original user
        .mockResolvedValueOnce({ id: 'other-id', email: 'taken@example.com' }); // find conflicting email

      await expect(
        service.update({ email: 'taken@example.com' }, req),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update and save user when data is valid', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // find original user
        .mockResolvedValueOnce(null); // no username conflict
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        username: 'updated',
      });

      const result = await service.update({ username: 'updated' }, req);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.username).toBe('updated');
    });

    it('should update notificationHour when provided', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        notificationHour: 8,
      });

      const result = await service.update({ notificationHour: 8 }, req);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.notificationHour).toBe(8);
    });
  });

  describe('changePassword', () => {
    const req = {
      user: {
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
      },
    };

    const dto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      repeatPassword: 'NewPassword123!',
    };

    it('should throw BadRequestException if newPassword and repeatPassword do not match', async () => {
      const mismatchDto = { ...dto, repeatPassword: 'DifferentPassword123!' };
      await expect(service.changePassword(mismatchDto, req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.changePassword(dto, req)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if currentPassword is incorrect', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPasswordService.comparePasswords.mockResolvedValue(false);

      await expect(service.changePassword(dto, req)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPasswordService.comparePasswords).toHaveBeenCalledWith(
        'OldPassword123!',
        mockUser.password,
      );
    });

    it('should update password successfully when currentPassword is correct', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockPasswordService.comparePasswords.mockResolvedValue(true);
      mockPasswordService.hashPassword.mockResolvedValue('newhashedpassword');
      mockUserRepository.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.changePassword(dto, req);

      expect(mockPasswordService.comparePasswords).toHaveBeenCalledWith(
        'OldPassword123!',
        mockUser.password,
      );
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(
        'NewPassword123!',
      );
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'newhashedpassword',
        }),
      );
      expect(result).toEqual({
        message: 'Contraseña actualizada correctamente',
      });
    });
  });

  describe('remove', () => {
    const req = {
      user: {
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
      },
    };

    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(req)).rejects.toThrow(NotFoundException);
    });

    it('should remove user and return success message', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.remove.mockResolvedValue(mockUser);

      const result = await service.remove(req);
      expect(mockUserRepository.remove).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ message: 'Usuario eliminado correctamente' });
    });
  });
});
