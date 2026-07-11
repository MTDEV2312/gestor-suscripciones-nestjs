import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login and return the result', async () => {
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const expectedResult = {
        token: 'jwt_token',
        user: { id: '1', username: 'user' },
      };
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('register', () => {
    it('should call authService.register and return the result', async () => {
      const dto: RegisterDto = {
        username: 'test',
        email: 'test@example.com',
        password: 'password123',
        repeatPassword: 'password123',
      };
      const expectedResult = {
        id: '1',
        username: 'test',
        email: 'test@example.com',
      };
      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });
});
