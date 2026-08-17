import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

import { RedisService } from '../src/infrastructure/redis/redis.service';

interface AuthResponse {
  user: { id: string; username: string };
  accessToken: string;
}

describe('Anonymous Matching & Full Anonymous Chat (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redisService: RedisService;

  const stamp = Date.now();
  const credentials = [0, 1, 2].map((i) => ({
    email: `anon_${stamp}_${i}@mixchat.app`,
    username: `anon_${stamp}_${i}`,
    password: 'Password123!',
  }));

  const tokens: string[] = [];
  const userIds: string[] = [];
  let matchedSessionId: string;

  const clearRedisKeys = async () => {
    const client = redisService.getClient();
    const keys = await client.keys('mixchat:anonymous:*');
    if (keys.length > 0) {
      await client.del(...keys);
    }
  };

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = fixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
    prisma = app.get(PrismaService);
    redisService = app.get(RedisService);

    await clearRedisKeys();

    // Register users
    for (const cred of credentials) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(cred)
        .expect(201);

      const body = res.body as AuthResponse;
      tokens.push(body.accessToken);
      userIds.push(body.user.id);
    }
  });

  afterAll(async () => {
    await clearRedisKeys();
    if (userIds.length > 0) {
      await prisma.anonymousReport.deleteMany({
        where: { reporterId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    await app.close();
  });

  describe('Queue Lifecycle & Matchmaking', () => {
    it('GET /api/v1/anonymous/queue/status -> IDLE when not queued', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/anonymous/queue/status')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(200);

      expect(res.body.status).toBe('IDLE');
    });

    it('POST /api/v1/anonymous/queue/join -> User 0 joins queue (SEARCHING)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/anonymous/queue/join')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({ interests: ['Tech', 'Gaming'] })
        .expect(200);

      expect(res.body.status).toBe('SEARCHING');
      expect(res.body.interests).toEqual(['Tech', 'Gaming']);
    });

    it('POST /api/v1/anonymous/queue/leave -> User 0 leaves queue (IDLE)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/anonymous/queue/leave')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/anonymous/queue/status')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(200);

      expect(res.body.status).toBe('IDLE');
    });

    it('Matches User 0 and User 1 with overlapping interests', async () => {
      // User 0 joins queue
      await request(app.getHttpServer())
        .post('/api/v1/anonymous/queue/join')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({ interests: ['Tech'] })
        .expect(200);

      // User 1 joins queue with matching interest
      const matchRes = await request(app.getHttpServer())
        .post('/api/v1/anonymous/queue/join')
        .set('Authorization', `Bearer ${tokens[1]}`)
        .send({ interests: ['Tech', 'Music'] })
        .expect(200);

      expect(matchRes.body.status).toBe('MATCHED');
      expect(matchRes.body.session).toBeDefined();
      matchedSessionId = matchRes.body.session.id;
      expect(matchedSessionId).toBeDefined();
    });
  });

  describe('Privacy Invariant & Messaging', () => {
    it('GET /api/v1/anonymous/session/:id -> Zero real identity leakage before reveal', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/anonymous/session/${matchedSessionId}`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(200);

      expect(res.body.id).toBe(matchedSessionId);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.me.displayName).toMatch(/^Anonymous /);
      expect(res.body.partner.displayName).toMatch(/^Anonymous /);
      expect(res.body.revealConsent.isMutual).toBe(false);
      expect(res.body.revealedPartner).toBeNull();
    });

    it('POST /api/v1/anonymous/session/:id/message -> Sends anonymous message', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/anonymous/session/${matchedSessionId}/message`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({
          content: 'Hello secret friend!',
          type: 'TEXT',
        })
        .expect(200);

      expect(res.body.content).toBe('Hello secret friend!');
      expect(res.body.isOwn).toBe(true);
      expect(res.body.senderId).toBeDefined();
    });

    it('IDOR Check: Third user (User 2) rejected from session', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/anonymous/session/${matchedSessionId}`)
        .set('Authorization', `Bearer ${tokens[2]}`)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/v1/anonymous/session/${matchedSessionId}/message`)
        .set('Authorization', `Bearer ${tokens[2]}`)
        .send({ content: 'Attacker injection' })
        .expect(403);
    });
  });

  describe('Mutual Reveal Handshake', () => {
    it('One-sided reveal request preserves anonymity', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/anonymous/session/${matchedSessionId}/reveal`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(200);

      expect(res.body.revealConsent.me).toBe(true);
      expect(res.body.revealConsent.partner).toBe(false);
      expect(res.body.revealConsent.isMutual).toBe(false);
      expect(res.body.revealedPartner).toBeNull();
    });

    it('Mutual reveal establishes identity exchange', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/anonymous/session/${matchedSessionId}/reveal`)
        .set('Authorization', `Bearer ${tokens[1]}`)
        .expect(200);

      expect(res.body.status).toBe('REVEALED');
      expect(res.body.revealConsent.isMutual).toBe(true);
      expect(res.body.revealedPartner).not.toBeNull();
      expect(res.body.revealedPartner.username).toBe(credentials[0].username);
    });
  });

  describe('Anonymous Block & Report', () => {
    it('POST /api/v1/anonymous/session/:id/report -> Submits durable report and ends session', async () => {
      const reportRes = await request(app.getHttpServer())
        .post(`/api/v1/anonymous/session/${matchedSessionId}/report`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({
          reason: 'Spam / promotional links',
          details: 'User tried to advertise crypto',
        })
        .expect(200);

      expect(reportRes.body.success).toBe(true);
      expect(reportRes.body.reportId).toBeDefined();

      const savedReport = await prisma.anonymousReport.findUnique({
        where: { id: reportRes.body.reportId },
      });
      expect(savedReport).not.toBeNull();
      expect(savedReport?.reportedUserId).toBe(userIds[1]);
    });
  });
});
