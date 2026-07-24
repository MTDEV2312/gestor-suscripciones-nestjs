import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionHistoryService } from './subscription-history.service';
import { SubscriptionHistory } from './entities/subscription-history.entity';

describe('SubscriptionHistoryService', () => {
  let service: SubscriptionHistoryService;

  const mockHistory: SubscriptionHistory = {
    id: 'hist-uuid',
    subscription_id: 'sub-uuid',
    price: 19.99,
    old_price: 15.99,
    currency: 'USD',
    frequency: 'YEARLY',
    old_frequency: 'MONTHLY',
    effective_date: '2026-07-23',
    created_at: new Date(),
    subscription: {} as any,
  };

  const mockCreate = jest.fn();
  const mockSave = jest.fn();
  const mockFind = jest.fn();

  const mockRepository = {
    create: mockCreate,
    save: mockSave,
    find: mockFind,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionHistoryService,
        {
          provide: getRepositoryToken(SubscriptionHistory),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionHistoryService>(
      SubscriptionHistoryService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordChange', () => {
    it('should create and save history record', async () => {
      const dto = {
        subscription_id: 'sub-uuid',
        price: 19.99,
        old_price: 15.99,
        currency: 'USD',
        frequency: 'YEARLY' as const,
        old_frequency: 'MONTHLY' as const,
        effective_date: '2026-07-23',
      };

      mockCreate.mockReturnValue(mockHistory);
      mockSave.mockResolvedValue(mockHistory);

      const result = await service.recordChange(dto);

      expect(mockCreate).toHaveBeenCalledWith(dto);
      expect(mockSave).toHaveBeenCalledWith(mockHistory);
      expect(result).toEqual(mockHistory);
    });
  });

  describe('findBySubscription', () => {
    it('should find history records by subscription_id and user_id', async () => {
      mockFind.mockResolvedValue([mockHistory]);

      const result = await service.findBySubscription('sub-uuid', 'user-uuid');

      expect(mockFind).toHaveBeenCalledWith({
        where: {
          subscription_id: 'sub-uuid',
          subscription: {
            user_id: 'user-uuid',
          },
        },
        order: {
          created_at: 'DESC',
        },
      });
      expect(result).toEqual([mockHistory]);
    });
  });
});
