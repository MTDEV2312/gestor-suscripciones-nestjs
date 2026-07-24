import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';

describe('CurrencyController', () => {
  let controller: CurrencyController;
  let service: jest.Mocked<CurrencyService>;

  beforeEach(async () => {
    const mockService = {
      getFallbackRates: jest.fn(),
      setFallbackRate: jest.fn(),
      convert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrencyController],
      providers: [
        {
          provide: CurrencyService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CurrencyController>(CurrencyController);
    service = module.get(CurrencyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFallbackRates', () => {
    it('should return list of fallback rates from service', async () => {
      const mockRates = [
        {
          id: '1',
          base_currency: 'USD',
          target_currency: 'EUR',
          rate: 0.85,
          updated_at: new Date(),
        },
      ];
      service.getFallbackRates.mockResolvedValue(mockRates as any);

      const result = await controller.getFallbackRates();
      expect(result).toEqual(mockRates);
      expect(service.getFallbackRates).toHaveBeenCalled();
    });
  });

  describe('setFallbackRatePost and setAdminExchangeRates', () => {
    it('should update fallback rate via service', async () => {
      const dto = {
        base_currency: 'USD',
        target_currency: 'EUR',
        rate: 0.9,
      };
      const mockUpdated = { id: '1', ...dto, updated_at: new Date() };
      service.setFallbackRate.mockResolvedValue(mockUpdated as any);

      const result = await controller.setFallbackRatePost(dto);
      expect(result).toEqual(mockUpdated);
      expect(service.setFallbackRate).toHaveBeenCalledWith('USD', 'EUR', 0.9);
    });
  });

  describe('convert', () => {
    it('should calculate conversion using service', async () => {
      service.convert.mockResolvedValue(90);

      const result = await controller.convert('100', 'USD', 'EUR');
      expect(result).toEqual({
        amount: 100,
        from: 'USD',
        to: 'EUR',
        converted: 90,
      });
      expect(service.convert).toHaveBeenCalledWith(100, 'USD', 'EUR');
    });
  });
});
