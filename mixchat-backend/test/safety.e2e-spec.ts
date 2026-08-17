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
import {
  UserRole,
  ReportTargetType,
  ReportReason,
  ModerationActionType,
} from '@prisma/client';

describe('Safety, Reports & Moderation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const aliceCreds = {
    email: `alice_safety_${stamp}@mixchat.app`,
    username: `alice_safe_${stamp}`,
    password: 'Password123!',
  };
  const bobCreds = {
    email: `bob_safety_${stamp}@mixchat.app`,
    username: `bob_safe_${stamp}`,
    password: 'Password123!',
  };
  const adminCreds = {
    email: `admin_safety_${stamp}@mixchat.app`,
    username: `admin_safe_${stamp}`,
    password: 'Password123!',
  };

  let aliceToken: string;
  let aliceId: string;
  let bobToken: string;
  let bobId: string;
  let adminToken: string;
  let adminId: string;

  let createdPostId: string;
  let createdReportId: string;

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
    // Register Alice
    const regAlice = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(aliceCreds)
      .expect(201);
    aliceToken = regAlice.body.accessToken;
    aliceId = regAlice.body.user.id;

    // Register Bob
    const regBob = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(bobCreds)
      .expect(201);
    bobToken = regBob.body.accessToken;
    bobId = regBob.body.user.id;

    // Register Admin and promote role
    const regAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(adminCreds)
      .expect(201);
    adminId = regAdmin.body.user.id;

    await prisma.user.update({
      where: { id: adminId },
      data: { role: UserRole.ADMIN },
    });

    // Re-login admin to refresh token role payload if needed
    const logAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: adminCreds.email, password: adminCreds.password })
      .expect(200);
    adminToken = logAdmin.body.accessToken;

    // Bob creates a post
    const postRes = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        content: 'Post with questionable content for safety testing',
      })
      .expect(201);
    createdPostId = postRes.body.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.moderationAction.deleteMany({
      where: { moderatorId: adminId },
    });
    await prisma.report.deleteMany({
      where: { reporterId: aliceId },
    });
    await prisma.post.deleteMany({
      where: { authorId: bobId },
    });
    await prisma.block.deleteMany({
      where: { OR: [{ blockerId: aliceId }, { blockerId: bobId }] },
    });
    await prisma.mute.deleteMany({
      where: { muterId: aliceId },
    });
    await prisma.authSession.deleteMany({
      where: { userId: { in: [aliceId, bobId, adminId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [aliceId, bobId, adminId] } },
    });

    await app.close();
  });

  describe('1. Unified Reporting System', () => {
    it('POST /api/v1/safety/reports — Alice reports Bob post', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/safety/reports')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          targetType: ReportTargetType.POST,
          targetId: createdPostId,
          reason: ReportReason.SPAM,
          details: 'Suspicious commercial spam',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.targetType).toBe(ReportTargetType.POST);
      expect(res.body.targetId).toBe(createdPostId);
      expect(res.body.status).toBe('OPEN');
      createdReportId = res.body.id;
    });

    it('POST /api/v1/safety/reports — Duplicate report returns existing receipt without error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/safety/reports')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          targetType: ReportTargetType.POST,
          targetId: createdPostId,
          reason: ReportReason.SPAM,
        })
        .expect(201);

      expect(res.body.id).toBe(createdReportId);
    });

    it('GET /api/v1/safety/reports/mine — Alice lists her submitted reports', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/safety/reports/mine')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. User Safety Controls (Block & Mute)', () => {
    it('POST /api/v1/safety/mute/:userId — Alice mutes Bob', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/safety/mute/${bobId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/safety/muted — Alice lists muted accounts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/safety/muted')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(bobId);
    });

    it('POST /api/v1/safety/block/:userId — Alice blocks Bob', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/safety/block/${bobId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/safety/blocked — Alice lists blocked accounts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/safety/blocked')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(bobId);
    });

    it('DELETE /api/v1/safety/block/:userId — Alice unblocks Bob', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/safety/block/${bobId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/v1/safety/mute/:userId — Alice unmutes Bob', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/safety/mute/${bobId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Admin Moderation Queue & Action Execution', () => {
    it('GET /api/v1/admin/moderation/reports — Admin views open reports', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/moderation/reports?status=OPEN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      const found = res.body.items.find(
        (item: any) => item.id === createdReportId,
      );
      expect(found).toBeDefined();
    });

    it('GET /api/v1/admin/moderation/reports/:id — Non-admin is forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/admin/moderation/reports/${createdReportId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(403);
    });

    it('POST /api/v1/admin/moderation/reports/:id/action — Admin removes reported content', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/moderation/reports/${createdReportId}/action`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: ModerationActionType.REMOVE_CONTENT,
          reason: 'Violates spam policy',
          resolutionNotes: 'Removed during test',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.action).toBe(ModerationActionType.REMOVE_CONTENT);

      // Verify post status is now REMOVED_BY_MODERATION
      const postInDb = await prisma.post.findUnique({
        where: { id: createdPostId },
      });
      expect(postInDb?.status).toBe('REMOVED_BY_MODERATION');
    });
  });
});
