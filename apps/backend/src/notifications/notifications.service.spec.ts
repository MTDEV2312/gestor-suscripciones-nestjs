import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<b>Netflix & "HBO"</b> <script>';
      const expected =
        '&lt;b&gt;Netflix &amp; &quot;HBO&quot;&lt;/b&gt; &lt;script&gt;';
      expect(service.escapeHtml(input)).toBe(expected);
    });

    it('should return empty string if input is falsy', () => {
      expect(service.escapeHtml('')).toBe('');
    });
  });
});
