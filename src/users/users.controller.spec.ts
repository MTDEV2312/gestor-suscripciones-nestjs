import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findUserInfo: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockAuthUser: AuthUser = {
    id: 'user-uuid',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockRequest = {
    user: mockAuthUser,
  } as unknown as Request & { user: AuthUser };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findById (GET /me)', () => {
    it('should call usersService.findUserInfo with the request', async () => {
      const expectedResult = {
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
      };
      mockUsersService.findUserInfo.mockResolvedValue(expectedResult);

      const result = await controller.findById(mockRequest);
      expect(mockUsersService.findUserInfo).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update (PATCH /)', () => {
    it('should call usersService.update with dto and request', async () => {
      const dto: UpdateUserDto = { username: 'newname' };
      const expectedResult = { id: 'user-uuid', username: 'newname' };
      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(dto, mockRequest);
      expect(mockUsersService.update).toHaveBeenCalledWith(dto, mockRequest);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove (DELETE /)', () => {
    it('should call usersService.remove with the request', async () => {
      const expectedResult = { message: 'Usuario eliminado correctamente' };
      mockUsersService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(mockRequest);
      expect(mockUsersService.remove).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(expectedResult);
    });
  });
});
