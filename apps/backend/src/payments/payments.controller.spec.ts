import { Test, TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: jest.Mocked<PaymentsService>;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockReq: any = { user: mockUser };

  const mockPayment: any = {
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
    status: 'PAID',
  };

  beforeEach(async () => {
    const mockPaymentsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getExpenseReport: jest.fn(),
      exportCsv: jest.fn(),
      exportPdf: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get(PaymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with DTO and req', async () => {
      service.create.mockResolvedValue(mockPayment);
      const dto: any = {
        subscription_name: 'Netflix',
        amount: 15.99,
        currency: 'USD',
        payment_date: '2026-08-15',
        billing_month: 8,
        billing_year: 2026,
      };

      const result = await controller.create(dto, mockReq);
      expect(service.create).toHaveBeenCalledWith(dto, mockReq);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query params', async () => {
      service.findAll.mockResolvedValue([mockPayment]);
      const query: any = { status: 'PAID' };

      const result = await controller.findAll(query, mockReq);
      expect(service.findAll).toHaveBeenCalledWith(mockReq, query);
      expect(result).toEqual([mockPayment]);
    });
  });

  describe('getExpenseReport', () => {
    it('should call service.getExpenseReport', async () => {
      const mockReport: any = {
        total_spent: 15.99,
        target_currency: 'USD',
        paid_count: 1,
        subscriptions_count: 1,
        currency_breakdown: { USD: 15.99 },
        monthly_breakdown: [],
        payments: [mockPayment],
      };
      service.getExpenseReport.mockResolvedValue(mockReport);
      const query: any = { startMonth: '2026-08', endMonth: '2026-08' };

      const result = await controller.getExpenseReport(query, mockReq);
      expect(service.getExpenseReport).toHaveBeenCalledWith(mockReq, query);
      expect(result).toEqual(mockReport);
    });
  });

  describe('exportCsv', () => {
    it('should set headers and stream CSV', async () => {
      const csvData = '\uFEFFheader1,header2\r\nval1,val2';
      service.exportCsv.mockResolvedValue(csvData);

      const res: any = {
        setHeader: jest.fn(),
      };

      const query: any = { startMonth: '2026-08' };
      const result = await controller.exportCsv(query, mockReq, res);

      expect(service.exportCsv).toHaveBeenCalledWith(mockReq, query);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="reporte-pagos-2026-08.csv"',
      );
      expect(result).toBe(csvData);
    });
  });

  describe('exportPdf', () => {
    it('should set headers and return PDF buffer', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 Mock PDF Content');
      service.exportPdf.mockResolvedValue(pdfBuffer);

      const res: any = {
        setHeader: jest.fn(),
      };

      const query: any = { startMonth: '2026-08' };
      const result = await controller.exportPdf(query, mockReq, res);

      expect(service.exportPdf).toHaveBeenCalledWith(mockReq, query);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="reporte-gastos-2026-08.pdf"',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Length',
        pdfBuffer.length.toString(),
      );
      expect(result).toBeInstanceOf(StreamableFile);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      service.findOne.mockResolvedValue(mockPayment);

      const result = await controller.findOne('pay-1', mockReq);
      expect(service.findOne).toHaveBeenCalledWith('pay-1', mockReq);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      service.update.mockResolvedValue(mockPayment);
      const dto: any = { amount: 19.99 };

      const result = await controller.update('pay-1', dto, mockReq);
      expect(service.update).toHaveBeenCalledWith('pay-1', dto, mockReq);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      service.remove.mockResolvedValue({
        message: 'Pago eliminado exitosamente',
      });

      const result = await controller.remove('pay-1', mockReq);
      expect(service.remove).toHaveBeenCalledWith('pay-1', mockReq);
      expect(result).toEqual({ message: 'Pago eliminado exitosamente' });
    });
  });
});
