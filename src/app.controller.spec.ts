import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return a health object', () => {
      const response = appController.health();
      expect(response).toBeDefined();
      expect(response.status).toBe('OK');
      expect(response.timestamp).toBeDefined();
      expect(response.service).toBe('Gestión de Suscripciones');
      expect(response.version).toBe('1.0.0');
    });
  });
});
