import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { CurrencyService } from 'src/currency/currency.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: jest.Mocked<Repository<SubscriptionPayment>>;
  let subscriptionRepo: jest.Mocked<Repository<Subscription>>;
  let currencyService: jest.Mocked<CurrencyService>;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockReq = { user: mockUser };

  const mockPayment: SubscriptionPayment = {
    id: 'pay-1',
    user_id: 'user-123',
    subscription_id: 'sub-123',
    subscription_name: 'Netflix',
    amount: 15.99,
    currency: 'USD',
    payment_date: '2026-08-15',
    billing_month: 8,
    billing_year: 2026,
    billing_period: '2026-08',
    payment_method: 'Tarjeta',
    status: 'PAID',
    notes: 'Pago mensual',
    created_at: new Date('2026-08-15T12:00:00Z'),
    updated_at: new Date('2026-08-15T12:00:00Z'),
    user: {} as any,
    subscription: {} as any,
  };

  beforeEach(async () => {
    const mockPaymentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockSubscriptionRepository = {
      findOne: jest.fn(),
    };

    const mockCurrencyService = {
      convert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(SubscriptionPayment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: CurrencyService,
          useValue: mockCurrencyService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepo = module.get(getRepositoryToken(SubscriptionPayment));
    subscriptionRepo = module.get(getRepositoryToken(Subscription));
    currencyService = module.get(CurrencyService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a payment record', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.create.mockReturnValue(mockPayment);
      paymentRepo.save.mockResolvedValue(mockPayment);

      const dto = {
        subscription_id: 'sub-123',
        subscription_name: 'Netflix',
        amount: 15.99,
        currency: 'USD',
        payment_date: '2026-08-15',
        billing_month: 8,
        billing_year: 2026,
        status: 'PAID',
      };

      const result = await service.create(dto, mockReq);

      expect(paymentRepo.findOne).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          subscription_id: 'sub-123',
          billing_year: 2026,
          billing_month: 8,
          status: 'PAID',
        },
      });
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          billing_period: '2026-08',
          user_id: 'user-123',
        }),
      );
      expect(result).toEqual(mockPayment);
    });

    it('should throw ConflictException if duplicate payment exists and allow_duplicate is false', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      const dto = {
        subscription_id: 'sub-123',
        subscription_name: 'Netflix',
        amount: 15.99,
        currency: 'USD',
        payment_date: '2026-08-15',
        billing_month: 8,
        billing_year: 2026,
        status: 'PAID',
      };

      await expect(service.create(dto, mockReq)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow duplicate payment when allow_duplicate is true', async () => {
      paymentRepo.create.mockReturnValue(mockPayment);
      paymentRepo.save.mockResolvedValue(mockPayment);

      const dto = {
        subscription_id: 'sub-123',
        subscription_name: 'Netflix',
        amount: 15.99,
        currency: 'USD',
        payment_date: '2026-08-15',
        billing_month: 8,
        billing_year: 2026,
        status: 'PAID',
        allow_duplicate: true,
      };

      const result = await service.create(dto, mockReq);

      expect(paymentRepo.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(mockPayment);
    });

    it('should fallback to subscription name from repository when subscription_name is not provided', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      subscriptionRepo.findOne.mockResolvedValue({
        id: 'sub-123',
        name: 'Netflix Premium',
        user_id: 'user-123',
      } as any);
      paymentRepo.create.mockReturnValue(mockPayment);
      paymentRepo.save.mockResolvedValue(mockPayment);

      const dto = {
        subscription_id: 'sub-123',
        subscription_name: '',
        amount: 15.99,
        currency: 'USD',
        payment_date: '2026-08-15',
        billing_month: 8,
        billing_year: 2026,
        status: 'PAID',
      };

      const result = await service.create(dto, mockReq);

      expect(subscriptionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'sub-123', user_id: 'user-123' },
      });
      expect(result).toEqual(mockPayment);
    });
  });

  describe('findAll', () => {
    it('should query payments with proper user scope', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPayment]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(mockReq, {
        subscriptionId: 'sub-123',
        status: 'PAID',
      });

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'payment.subscription',
        'subscription',
      );
      expect(qb.where).toHaveBeenCalledWith('payment.user_id = :userId', {
        userId: 'user-123',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'payment.subscription_id = :subscriptionId',
        { subscriptionId: 'sub-123' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('payment.status = :status', {
        status: 'PAID',
      });
      expect(result).toEqual([mockPayment]);
    });
  });

  describe('findOne', () => {
    it('should return payment by id', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      const result = await service.findOne('pay-1', mockReq);
      expect(result).toEqual(mockPayment);
    });

    it('should throw NotFoundException if payment does not exist', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', mockReq)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update payment and recompute billing period if year/month changes', async () => {
      const existing = { ...mockPayment };
      paymentRepo.findOne.mockResolvedValue(existing);
      paymentRepo.save.mockImplementation((p) =>
        Promise.resolve(p as SubscriptionPayment),
      );

      const result = await service.update(
        'pay-1',
        { billing_month: 9, billing_year: 2026 },
        mockReq,
      );

      expect(result.billing_month).toBe(9);
      expect(result.billing_period).toBe('2026-09');
    });
  });

  describe('remove', () => {
    it('should delete payment successfully', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);
      paymentRepo.remove.mockResolvedValue(mockPayment);

      const result = await service.remove('pay-1', mockReq);
      expect(result).toEqual({ message: 'Pago eliminado exitosamente' });
    });
  });

  describe('getExpenseReport', () => {
    it('should calculate consolidated metrics, currency breakdown, and monthly breakdown', async () => {
      const paymentUsd = {
        ...mockPayment,
        id: 'p-1',
        amount: 10.0,
        currency: 'USD',
        billing_period: '2026-08',
      };
      const paymentEur = {
        ...mockPayment,
        id: 'p-2',
        amount: 20.0,
        currency: 'EUR',
        billing_period: '2026-08',
      };

      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([paymentUsd, paymentEur]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(qb);

      currencyService.convert
        .mockResolvedValueOnce(10.0)
        .mockResolvedValueOnce(22.0);

      const report = await service.getExpenseReport(mockReq, {
        startMonth: '2026-08',
        endMonth: '2026-08',
        targetCurrency: 'USD',
      });

      expect(report.total_spent).toBe(32.0);
      expect(report.target_currency).toBe('USD');
      expect(report.paid_count).toBe(2);
      expect(report.currency_breakdown).toEqual({ USD: 10, EUR: 20 });
      expect(report.monthly_breakdown).toEqual([
        {
          period: '2026-08',
          year: 2026,
          month: 8,
          total_amount: 32.0,
          transaction_count: 2,
        },
      ]);
    });

    it('should throw BadRequestException if startDate is after endDate', async () => {
      await expect(
        service.getExpenseReport(mockReq, {
          startDate: '2026-12-31',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return empty report when no payments match', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(qb);

      const report = await service.getExpenseReport(mockReq, {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      expect(report.total_spent).toBe(0);
      expect(report.paid_count).toBe(0);
      expect(report.subscriptions_count).toBe(0);
      expect(report.monthly_breakdown).toEqual([]);
    });
  });

  describe('exportCsv', () => {
    it('should generate CSV with UTF-8 BOM, Spanish headers, and sanitize formula injection', async () => {
      const maliciousPayment = {
        ...mockPayment,
        subscription_name: '=CMD()',
        notes: '+sum(A1:A2)',
      };

      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([maliciousPayment]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(qb);
      currencyService.convert.mockResolvedValue(15.99);

      const csv = await service.exportCsv(mockReq, {});

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Fecha de Pago,Suscripción,Período');
      expect(csv).toContain("'=CMD()");
      expect(csv).toContain("'+sum(A1:A2)");
    });
  });

  describe('exportPdf', () => {
    it('should generate a valid PDF buffer with multi-subscription breakdown', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPayment]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(qb);
      currencyService.convert.mockResolvedValue(15.99);

      const pdfBuffer = await service.exportPdf(mockReq, {
        startMonth: '2026-08',
        endMonth: '2026-08',
        targetCurrency: 'USD',
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      const pdfString = pdfBuffer.toString('latin1');
      expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfString).toContain('%%EOF');
      expect(pdfString).toContain('GESTOR DE SUSCRIPCIONES');
      expect(pdfString).toContain('RESUMEN POR SUSCRIPCION');
      expect(pdfString).toContain('Netflix');
    });

    it('should generate PDF buffer with subscription profile when filtering by specific subscription', async () => {
      const paymentWithSub = {
        ...mockPayment,
        subscription: {
          id: 'sub-123',
          name: 'Netflix Premium',
          price: 15.99,
          currency: 'USD',
          frequency: 'MONTHLY',
          type: 'SUBSCRIPTION',
          next_renewal_date: '2026-09-15',
          is_active: true,
        },
      };

      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([paymentWithSub]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(qb);
      currencyService.convert.mockResolvedValue(15.99);

      const pdfBuffer = await service.exportPdf(mockReq, {
        subscriptionId: 'sub-123',
        targetCurrency: 'USD',
      });

      const pdfString = pdfBuffer.toString('latin1');
      expect(pdfString).toContain('INFORMACION DE LA SUSCRIPCION');
      expect(pdfString).toContain('Proxima Renovacion');
    });

    it('should generate a valid PDF buffer for empty date range without errors', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(qb);

      const pdfBuffer = await service.exportPdf(mockReq, {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      const pdfString = pdfBuffer.toString('latin1');
      expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfString).toContain('No se encontraron pagos');
    });
  });
});
