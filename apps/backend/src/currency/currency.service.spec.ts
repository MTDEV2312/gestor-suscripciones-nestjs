import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CurrencyService } from './currency.service';
import { ExchangeRateFallback } from './entities/exchange-rate-fallback.entity';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let fallbackRepository: jest.Mocked<Repository<ExchangeRateFallback>>;
  let configService: jest.Mocked<ConfigService>;

  const mockFallback: ExchangeRateFallback = {
    id: 'fallback-uuid-1',
    base_currency: 'USD',
    target_currency: 'EUR',
    rate: 0.85,
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        {
          provide: getRepositoryToken(ExchangeRateFallback),
          useValue: mockRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
    fallbackRepository = module.get(getRepositoryToken(ExchangeRateFallback));
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('convert with external API success', () => {
    it('should convert currency using external API rates when available', async () => {
      configService.get.mockReturnValue('test-api-key');
      const mockApiResponse = {
        result: 'success',
        base_code: 'USD',
        conversion_rates: {
          USD: 1.0,
          EUR: 0.9,
          MXN: 18.0,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      } as any);

      const result = await service.convert(100, 'USD', 'EUR');
      expect(result).toBe(90);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://v6.exchangerate-api.com/v6/test-api-key/latest/USD',
      );
    });

    it('should cache rates within TTL and avoid duplicate fetch calls', async () => {
      configService.get.mockReturnValue('test-api-key');
      const mockApiResponse = {
        result: 'success',
        base_code: 'USD',
        conversion_rates: {
          USD: 1.0,
          EUR: 0.9,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      } as any);

      await service.convert(100, 'USD', 'EUR');
      await service.convert(200, 'USD', 'EUR');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('convert fallback behavior on API failure or 500/timeout', () => {
    it('should fall back to DB ExchangeRateFallback when API fails with 500', async () => {
      configService.get.mockReturnValue('secret-api-key-123');

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error 500 Internal Server Error'));

      fallbackRepository.findOne.mockResolvedValue(mockFallback);

      const result = await service.convert(100, 'USD', 'EUR');
      expect(result).toBe(85);
      expect(fallbackRepository.findOne).toHaveBeenCalledWith({
        where: { base_currency: 'USD', target_currency: 'EUR' },
      });
    });

    it('should fall back to inverted rate if direct base-target pair is not found', async () => {
      configService.get.mockReturnValue('secret-api-key-123');

      global.fetch = jest.fn().mockRejectedValue(new Error('API Timeout'));

      fallbackRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'fb-2',
          base_currency: 'EUR',
          target_currency: 'USD',
          rate: 1.25,
          updated_at: new Date(),
        } as ExchangeRateFallback);

      const result = await service.convert(100, 'USD', 'EUR');
      expect(result).toBe(80); // 100 * (1 / 1.25) = 80
    });

    it('should return same amount when converting same currency even if API fails', async () => {
      const result = await service.convert(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should not expose API key in error messages when API fails', async () => {
      const sensitiveKey = 'super-secret-api-key-xyz';
      configService.get.mockReturnValue(sensitiveKey);

      global.fetch = jest.fn().mockRejectedValue(new Error('Connection failed'));
      fallbackRepository.findOne.mockResolvedValue(null);

      try {
        await service.convert(100, 'USD', 'JPY');
      } catch (err: any) {
        expect(err.message).not.toContain(sensitiveKey);
      }
    });
  });

  describe('Admin Fallback Management', () => {
    it('should set fallback rate updating existing record if present', async () => {
      fallbackRepository.findOne.mockResolvedValue(mockFallback);
      fallbackRepository.save.mockResolvedValue({
        ...mockFallback,
        rate: 0.88,
      });

      const updated = await service.setFallbackRate('USD', 'EUR', 0.88);
      expect(updated.rate).toBe(0.88);
      expect(fallbackRepository.save).toHaveBeenCalled();
    });

    it('should set fallback rate creating new record if not present', async () => {
      fallbackRepository.findOne.mockResolvedValue(null);
      const newEntity = {
        base_currency: 'USD',
        target_currency: 'GBP',
        rate: 0.75,
      } as ExchangeRateFallback;

      fallbackRepository.create.mockReturnValue(newEntity);
      fallbackRepository.save.mockResolvedValue({
        id: 'new-id',
        ...newEntity,
        updated_at: new Date(),
      });

      const created = await service.setFallbackRate('USD', 'GBP', 0.75);
      expect(created.rate).toBe(0.75);
      expect(fallbackRepository.create).toHaveBeenCalledWith({
        base_currency: 'USD',
        target_currency: 'GBP',
        rate: 0.75,
      });
    });

    it('should list all fallback rates', async () => {
      fallbackRepository.find.mockResolvedValue([mockFallback]);
      const rates = await service.getFallbackRates();
      expect(rates).toEqual([mockFallback]);
    });
  });
});
