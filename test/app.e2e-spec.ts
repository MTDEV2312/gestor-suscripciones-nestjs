import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('System E2E Lifecycle', () => {
  let app: INestApplication<App>;
  let jwtToken: string;
  let createdSubscriptionId: string;

  const testEmail = `e2e_${Math.random().toString(36).substring(7)}@example.com`;
  const testUsername = `user_${Math.random().toString(36).substring(7)}`;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['health'],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .then((response) => {
        expect(response.body).toBeDefined();
        expect(response.body.status).toBe('OK');
      });
  });

  describe('Auth Flow', () => {
    it('/api/auth/register (POST)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: testUsername,
          email: testEmail,
          password: testPassword,
          repeatPassword: testPassword,
          telegramUsername: 'test_telegram',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(response.body.id).toBeDefined();
          expect(response.body.username).toBe(testUsername);
          expect(response.body.email).toBe(testEmail);
        });
    });

    it('/api/auth/login (POST)', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(response.body.token).toBeDefined();
          jwtToken = response.body.token;
        });
    });
  });

  describe('Users Flow', () => {
    it('/api/users/me (GET) - Get user profile info', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(response.body.username).toBe(testUsername);
          expect(response.body.email).toBe(testEmail);
          expect(response.body.telegramUsername).toBe('test_telegram');
        });
    });

    it('/api/users (PATCH) - Update user profile', () => {
      return request(app.getHttpServer())
        .patch('/api/users')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          telegramUsername: 'updated_telegram',
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(response.body.telegramUsername).toBe('updated_telegram');
        });
    });
  });

  describe('Subscriptions & Dashboard Flow', () => {
    it('/api/subscriptions (POST) - Create subscription', () => {
      return request(app.getHttpServer())
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: 'Netflix E2E',
          price: 13.99,
          currency: 'USD',
          frequency: 'MONTHLY',
          start_date: '2026-07-06',
          next_renewal_date: '2026-08-06',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(response.body.subscription).toBeDefined();
          expect(response.body.subscription.name).toBe('Netflix E2E');
          createdSubscriptionId = response.body.subscription.id;
        });
    });

    it('/api/subscriptions (GET) - Find all subscriptions', () => {
      return request(app.getHttpServer())
        .get('/api/subscriptions')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThanOrEqual(1);
          const sub = response.body.find((s: any) => s.id === createdSubscriptionId);
          expect(sub).toBeDefined();
          expect(sub.name).toBe('Netflix E2E');
        });
    });

    it('/api/subscriptions/:id (GET) - Find one subscription', () => {
      return request(app.getHttpServer())
        .get(`/api/subscriptions/${createdSubscriptionId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(response.body.id).toBe(createdSubscriptionId);
          expect(response.body.name).toBe('Netflix E2E');
        });
    });

    it('/api/subscriptions/:id (PATCH) - Update subscription', () => {
      return request(app.getHttpServer())
        .patch(`/api/subscriptions/${createdSubscriptionId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          price: 15.99,
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(response.body.price).toBe(15.99);
        });
    });

    it('/api/dashboard (GET) - Check dashboard info', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(response.body.monthlySpending).toBeDefined();
          expect(response.body.yearlySpending).toBeDefined();
        });
    });

    it('/api/subscriptions/:id (DELETE) - Delete subscription', () => {
      return request(app.getHttpServer())
        .delete(`/api/subscriptions/${createdSubscriptionId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(response.body.message).toBe('Suscripción eliminada exitosamente');
        });
    });
  });

  describe('User Deletion Flow', () => {
    it('/api/users (DELETE) - Remove user account', () => {
      return request(app.getHttpServer())
        .delete('/api/users')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toBeDefined();
          expect(response.body.message).toBe('Usuario eliminado correctamente');
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
