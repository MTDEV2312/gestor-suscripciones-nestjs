import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { UsersService } from 'src/users/users.service';
import { NotFoundException } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { SubscriptionHistoryService } from 'src/subscription-history/subscription-history.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  const mockSubscription: Subscription = {
    id: 'sub-uuid',
    name: 'Netflix',
    price: 15.99,
    currency: 'USD',
    frequency: 'MONTHLY',
    type: 'SUBSCRIPTION',
    start_date: '2026-07-10',
    next_renewal_date: '2026-08-10',
    is_active: true,
    user_id: 'user-uuid',
    created_at: new Date(),
    updated_at: new Date(),
    user: {} as User,
    history: [],
    tags: [],
  };

  const mockLeftJoinAndSelect = jest.fn().mockReturnThis();
  const mockWhere = jest.fn().mockReturnThis();
  const mockAndWhere = jest.fn().mockReturnThis();
  const mockGetMany = jest.fn();

  const mockQueryBuilder = {
    leftJoinAndSelect: mockLeftJoinAndSelect,
    where: mockWhere,
    andWhere: mockAndWhere,
    getMany: mockGetMany,
  };

  const mockCreate = jest.fn();
  const mockSave = jest.fn();
  const mockFind = jest.fn();
  const mockFindOne = jest.fn();
  const mockRemove = jest.fn();
  const mockCreateQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

  const mockSubscriptionRepository = {
    create: mockCreate,
    save: mockSave,
    find: mockFind,
    findOne: mockFindOne,
    remove: mockRemove,
    createQueryBuilder: mockCreateQueryBuilder,
  };

  const mockTagRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockFindById = jest.fn();
  const mockUsersService = {
    findById: mockFindById,
  };

  const mockRecordChange = jest.fn();
  const mockSubscriptionHistoryService = {
    recordChange: mockRecordChange,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: SubscriptionHistoryService,
          useValue: mockSubscriptionHistoryService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      name: 'Netflix',
      price: 15.99,
      currency: 'USD',
      frequency: 'MONTHLY' as const,
      start_date: '2026-07-10',
      next_renewal_date: '2026-08-10',
    };
    const req = {
      user: {
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
      },
    };

    it('should throw NotFoundException if user does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(service.create(createDto, req)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockFindById).toHaveBeenCalledWith('user-uuid');
    });

    it('should create and save subscription successfully', async () => {
      mockFindById.mockResolvedValue({ id: 'user-uuid' });
      mockCreate.mockReturnValue(mockSubscription);
      mockSave.mockResolvedValue(mockSubscription);

      const result = await service.create(createDto, req);

      expect(mockCreate).toHaveBeenCalledWith({
        ...createDto,
        user_id: 'user-uuid',
        tags: [],
      });
      expect(mockSave).toHaveBeenCalledWith(mockSubscription);
      expect(result).toEqual({
        message: 'Suscripción creada exitosamente',
        subscription: mockSubscription,
      });
    });

    it('should create and save subscription with a specific type (e.g. DOMAIN) successfully', async () => {
      const domainCreateDto = {
        ...createDto,
        type: 'DOMAIN' as const,
      };
      const expectedMockSub = {
        ...mockSubscription,
        type: 'DOMAIN' as const,
      };

      mockFindById.mockResolvedValue({ id: 'user-uuid' });
      mockCreate.mockReturnValue(expectedMockSub);
      mockSave.mockResolvedValue(expectedMockSub);

      const result = await service.create(domainCreateDto, req);

      expect(mockCreate).toHaveBeenCalledWith({
        ...domainCreateDto,
        user_id: 'user-uuid',
        tags: [],
      });
      expect(mockSave).toHaveBeenCalledWith(expectedMockSub);
      expect(result).toEqual({
        message: 'Suscripción creada exitosamente',
        subscription: expectedMockSub,
      });
    });
  });

  describe('findAll', () => {
    const req = {
      user: {
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
      },
    };

    it('should find all subscriptions belonging to the user', async () => {
      mockGetMany.mockResolvedValue([mockSubscription]);

      const result = await service.findAll(req);

      expect(mockCreateQueryBuilder).toHaveBeenCalledWith('subscription');
      expect(mockLeftJoinAndSelect).toHaveBeenCalledWith(
        'subscription.tags',
        'tag',
      );
      expect(mockWhere).toHaveBeenCalledWith('subscription.user_id = :userId', {
        userId: 'user-uuid',
      });
      expect(result).toEqual([mockSubscription]);
    });

    it('should filter subscriptions by tagId when tagId is provided', async () => {
      mockGetMany.mockResolvedValue([mockSubscription]);

      const result = await service.findAll(req, 'tag-uuid-1');

      expect(mockAndWhere).toHaveBeenCalledWith('tag.id = :tagId', {
        tagId: 'tag-uuid-1',
      });
      expect(result).toEqual([mockSubscription]);
    });
  });

  describe('findOne', () => {
    const req = {
      user: {
        id: 'user-uuid',
        username: 'testuser',
        email: 'test@example.com',
      },
    };

    it('should find subscription by id and user_id', async () => {
      mockFindOne.mockResolvedValue(mockSubscription);

      const result = await service.findOne('sub-uuid', req);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { id: 'sub-uuid', user_id: 'user-uuid' },
        relations: { tags: true },
      });
      expect(result).toEqual(mockSubscription);
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

    it('should throw NotFoundException if subscription does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(
        service.update('sub-uuid', { name: 'New Name' }, req),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update and save subscription', async () => {
      mockFindOne.mockResolvedValue({
        ...mockSubscription,
      });
      mockSave.mockImplementation((x) => Promise.resolve(x));

      const result = await service.update(
        'sub-uuid',
        { name: 'New Name' },
        req,
      );

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { id: 'sub-uuid', user_id: 'user-uuid' },
        relations: { tags: true },
      });
      expect(mockSave).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
      expect(mockRecordChange).not.toHaveBeenCalled();
    });

    it('should record history when price changes', async () => {
      mockFindOne.mockResolvedValue({
        ...mockSubscription,
        price: 15.99,
      });
      mockSave.mockImplementation((x) => Promise.resolve(x));

      await service.update('sub-uuid', { price: 19.99 }, req);

      expect(mockRecordChange).toHaveBeenCalledWith({
        subscription_id: 'sub-uuid',
        price: 19.99,
        old_price: 15.99,
        frequency: 'MONTHLY',
        old_frequency: 'MONTHLY',
        currency: 'USD',
        effective_date: expect.any(String),
      });
    });

    it('should recalculate next_renewal_date and record history when frequency changes', async () => {
      mockFindOne.mockResolvedValue({
        ...mockSubscription,
        start_date: '2026-07-10',
        frequency: 'MONTHLY',
        price: 15.99,
      });
      mockSave.mockImplementation((x) => Promise.resolve(x));

      const result = await service.update(
        'sub-uuid',
        { frequency: 'YEARLY' },
        req,
      );

      expect(result.next_renewal_date).toBe('2027-07-10');
      expect(mockRecordChange).toHaveBeenCalledWith({
        subscription_id: 'sub-uuid',
        price: 15.99,
        old_price: 15.99,
        frequency: 'YEARLY',
        old_frequency: 'MONTHLY',
        currency: 'USD',
        effective_date: expect.any(String),
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

    it('should throw NotFoundException if subscription does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(service.remove('sub-uuid', req)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should remove subscription and return success message', async () => {
      mockFindOne.mockResolvedValue(mockSubscription);
      mockRemove.mockResolvedValue(mockSubscription);

      const result = await service.remove('sub-uuid', req);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { id: 'sub-uuid', user_id: 'user-uuid' },
      });
      expect(mockRemove).toHaveBeenCalledWith(mockSubscription);
      expect(result).toEqual({
        message: 'Suscripción eliminada exitosamente',
      });
    });
  });

  describe('findDueRenewals', () => {
    it('should query active subscriptions with next_renewal_date <= today', async () => {
      const mockList = [mockSubscription];
      mockGetMany.mockResolvedValue(mockList);

      const result = await service.findDueRenewals();

      expect(mockCreateQueryBuilder).toHaveBeenCalledWith('subscription');
      expect(mockLeftJoinAndSelect).toHaveBeenCalledWith(
        'subscription.user',
        'user',
      );
      expect(mockWhere).toHaveBeenCalledWith(
        'subscription.is_active = :isActive',
        {
          isActive: true,
        },
      );
      expect(mockAndWhere).toHaveBeenCalledWith(
        'SUBSTR(subscription.next_renewal_date, 1, 10) <= :today',
        expect.any(Object),
      );
      expect(result).toEqual(mockList);
    });
  });

  describe('processDueRenewals', () => {
    it('should return immediately if subscription is inactive', async () => {
      const inactiveSubscription = {
        ...mockSubscription,
        is_active: false,
      };
      await service.processDueRenewals(inactiveSubscription);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should calculate new renewal date and save subscription for MONTHLY frequency', async () => {
      const sub = {
        ...mockSubscription,
        frequency: 'MONTHLY' as const,
        next_renewal_date: '2026-07-10',
      };
      mockSave.mockResolvedValue(sub);

      await service.processDueRenewals(sub);

      expect(sub.next_renewal_date).toBe('2026-08-10');
      expect(mockSave).toHaveBeenCalledWith(sub);
    });

    it('should calculate new renewal date and save subscription for YEARLY frequency', async () => {
      const sub = {
        ...mockSubscription,
        frequency: 'YEARLY' as const,
        next_renewal_date: '2026-07-10',
      };
      mockSave.mockResolvedValue(sub);

      await service.processDueRenewals(sub);

      expect(sub.next_renewal_date).toBe('2027-07-10');
      expect(mockSave).toHaveBeenCalledWith(sub);
    });

    it('should throw error if subscription frequency is unknown', async () => {
      const sub = {
        ...mockSubscription,
        frequency: 'UNKNOWN' as unknown as 'MONTHLY',
        next_renewal_date: '2026-07-10',
      };
      await expect(service.processDueRenewals(sub)).rejects.toThrow(
        'Subscription frequency unknown',
      );
    });
  });
});
