import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;

  const mockSubscriptionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
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
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call subscriptionsService.create', async () => {
      const dto: CreateSubscriptionDto = {
        name: 'Netflix',
        price: 15.99,
        currency: 'USD',
        frequency: 'MONTHLY',
        start_date: '2026-07-10',
        next_renewal_date: '2026-08-10',
      };
      const expectedResult = {
        message: 'Suscripción creada exitosamente',
        subscription: { id: '1' },
      };
      mockSubscriptionsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto, mockRequest);

      expect(mockSubscriptionsService.create).toHaveBeenCalledWith(
        dto,
        mockRequest,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should call subscriptionsService.findAll', async () => {
      const expectedResult = [{ id: '1', name: 'Netflix' }];
      mockSubscriptionsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockRequest);

      expect(mockSubscriptionsService.findAll).toHaveBeenCalledWith(
        mockRequest,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should call subscriptionsService.findOne', async () => {
      const expectedResult = { id: '1', name: 'Netflix' };
      mockSubscriptionsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne('1', mockRequest);

      expect(mockSubscriptionsService.findOne).toHaveBeenCalledWith(
        '1',
        mockRequest,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should call subscriptionsService.update', async () => {
      const dto: UpdateSubscriptionDto = { name: 'Netflix Premium' };
      const expectedResult = { id: '1', name: 'Netflix Premium' };
      mockSubscriptionsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', dto, mockRequest);

      expect(mockSubscriptionsService.update).toHaveBeenCalledWith(
        '1',
        dto,
        mockRequest,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should call subscriptionsService.remove', async () => {
      const expectedResult = { message: 'Suscripción eliminada exitosamente' };
      mockSubscriptionsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove('1', mockRequest);

      expect(mockSubscriptionsService.remove).toHaveBeenCalledWith(
        '1',
        mockRequest,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
