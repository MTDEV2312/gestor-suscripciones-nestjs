import { Test, TestingModule } from '@nestjs/testing';
import { RenewalScheduler } from './cron-job.scheduler';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { addDays, format } from 'date-fns';

describe('RenewalScheduler', () => {
  let scheduler: RenewalScheduler;
  let subscriptionsService: jest.Mocked<SubscriptionsService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const mockSubscriptionsService = {
      findDueRenewals: jest.fn().mockResolvedValue([]),
      findRenewalsInDays: jest.fn().mockResolvedValue([]),
      processDueRenewals: jest.fn().mockResolvedValue(undefined),
    };

    const mockNotificationsService = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RenewalScheduler,
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    scheduler = module.get<RenewalScheduler>(RenewalScheduler);
    subscriptionsService = module.get(SubscriptionsService);
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('checkRenewals threshold windows (7d, 3d, 1d)', () => {
    it('should query subscriptions renewing in 7, 3, and 1 day', async () => {
      await scheduler.checkRenewals();

      expect(subscriptionsService.findRenewalsInDays).toHaveBeenCalledWith(7, expect.any(Date));
      expect(subscriptionsService.findRenewalsInDays).toHaveBeenCalledWith(3, expect.any(Date));
      expect(subscriptionsService.findRenewalsInDays).toHaveBeenCalledWith(1, expect.any(Date));
      expect(subscriptionsService.findDueRenewals).toHaveBeenCalled();
    });

    it('should send preventive warning for 7-day renewal target', async () => {
      const mockSub7d = {
        id: 'sub-7d',
        name: 'Netflix',
        price: 15.99,
        currency: 'USD',
        next_renewal_date: '2026-07-30',
        user_id: 'user-1',
        user: { id: 'user-1', telegramUsername: 'testuser' },
      } as any;

      subscriptionsService.findRenewalsInDays.mockImplementation((days: number) => {
        if (days === 7) return Promise.resolve([mockSub7d]);
        return Promise.resolve([]);
      });

      await scheduler.checkUpcomingRenewals(7);

      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        expect.stringContaining('[Gestor Suscripciones] Recordatorio preventivo (7 días restantes):'),
        'testuser',
      );
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        expect.stringContaining('- Netflix el 2026-07-30. Costo: 15.99 USD.'),
        'testuser',
      );
    });

    it('should send preventive warning for 3-day renewal target', async () => {
      const mockSub3d = {
        id: 'sub-3d',
        name: 'Spotify',
        price: 9.99,
        currency: 'USD',
        next_renewal_date: '2026-07-26',
        user_id: 'user-1',
        user: { id: 'user-1', telegramUsername: 'testuser' },
      } as any;

      subscriptionsService.findRenewalsInDays.mockImplementation((days: number) => {
        if (days === 3) return Promise.resolve([mockSub3d]);
        return Promise.resolve([]);
      });

      await scheduler.checkUpcomingRenewals(3);

      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        expect.stringContaining('[Gestor Suscripciones] Recordatorio preventivo (3 días restantes):'),
        'testuser',
      );
    });

    it('should send imminent charge warning for 1-day renewal target', async () => {
      const mockSub1d = {
        id: 'sub-1d',
        name: 'AWS',
        price: 50,
        currency: 'USD',
        next_renewal_date: '2026-07-24',
        user_id: 'user-1',
        user: { id: 'user-1', telegramUsername: 'testuser' },
      } as any;

      subscriptionsService.findRenewalsInDays.mockImplementation((days: number) => {
        if (days === 1) return Promise.resolve([mockSub1d]);
        return Promise.resolve([]);
      });

      await scheduler.checkUpcomingRenewals(1);

      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        expect.stringContaining('[Gestor Suscripciones] ¡Alerta de cobro inminente! (1 día restante):'),
        'testuser',
      );
    });

    it('should calculate target dates across month boundaries accurately', () => {
      const baseDate = new Date('2026-01-28T12:00:00Z');
      const target7d = format(addDays(baseDate, 7), 'yyyy-MM-dd');
      const target3d = format(addDays(baseDate, 3), 'yyyy-MM-dd');
      const target1d = format(addDays(baseDate, 1), 'yyyy-MM-dd');

      expect(target7d).toBe('2026-02-04');
      expect(target3d).toBe('2026-01-31');
      expect(target1d).toBe('2026-01-29');
    });
  });
});
