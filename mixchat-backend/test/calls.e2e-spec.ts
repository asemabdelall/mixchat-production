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

describe('Voice & Video Calling System (e2e)', () => {
  let app: INestApplication<App>;
  const stamp = Date.now();
  const credentials = [0, 1].map((index) => ({
    email: `calling_${stamp}_${index}@mixchat.app`,
    username: `calling_${stamp}_${index}`,
    password: 'Password123!',
  }));
  const tokens: string[] = [];
  const userIds: string[] = [];
  let conversationId: string;
  let voiceCallId: string;
  let videoCallId: string;
  let prisma: PrismaService;

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

    // Register & Login two test users
    for (const cred of credentials) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(cred)
        .expect(201);

      tokens.push(res.body.accessToken);
      userIds.push(res.body.user.id);
    }

    // Create Direct Conversation between them
    const convRes = await request(app.getHttpServer())
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({
        type: 'DIRECT',
        targetUserId: userIds[1],
      })
      .expect(201);

    conversationId = convRes.body.id;
  });

  afterAll(async () => {
    // Cleanup calls, conversations, and users
    if (conversationId) {
      await prisma.callSession.deleteMany({
        where: { conversationId },
      });
      await prisma.conversation.deleteMany({
        where: { id: conversationId },
      });
    }
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    await app.close();
  });

  describe('1. Call Initiation & Token Issuance', () => {
    it('initiates a 1-to-1 voice call and returns LiveKit connection token for initiator', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/calls')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({
          conversationId,
          type: 'VOICE',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.type).toBe('VOICE');
      expect(res.body.status).toBe('RINGING');
      expect(res.body.initiatorId).toBe(userIds[0]);
      expect(res.body.participants.length).toBe(2);
      expect(res.body).toHaveProperty('livekit');
      expect(res.body.livekit).toHaveProperty('serverUrl');
      expect(res.body.livekit).toHaveProperty('participantToken');

      voiceCallId = res.body.id;
    });

    it('returns active/ringing call when querying GET /api/v1/calls/current', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/calls/current')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(200);

      expect(res.body).not.toBeNull();
      expect(res.body.id).toBe(voiceCallId);
      expect(res.body.status).toBe('RINGING');
    });

    it('prevents initiating a concurrent call when caller already has a ringing call', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/calls')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({
          conversationId,
          type: 'VOICE',
        })
        .expect(409);
    });
  });

  describe('2. Call Acceptance & LiveKit Credentials', () => {
    it('callee can request call token via POST /api/v1/calls/:id/token', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/calls/${voiceCallId}/token`)
        .set('Authorization', `Bearer ${tokens[1]}`)
        .send({})
        .expect(200);

      expect(res.body).toHaveProperty('serverUrl');
      expect(res.body).toHaveProperty('participantToken');
      expect(res.body).toHaveProperty('roomName');
    });

    it('callee accepts the call, transitioning state to ACTIVE and returning LiveKit token', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/calls/${voiceCallId}/accept`)
        .set('Authorization', `Bearer ${tokens[1]}`)
        .send({})
        .expect(200);

      expect(res.body.id).toBe(voiceCallId);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.answeredAt).not.toBeNull();
      expect(res.body.livekit).toHaveProperty('participantToken');
    });

    it('rejects caller attempting to accept their own call', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/calls/${voiceCallId}/accept`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({})
        .expect(403);
    });
  });

  describe('3. Call Termination & History', () => {
    it('ends the active call and computes call duration', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/calls/${voiceCallId}/end`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({})
        .expect(200);

      expect(res.body.id).toBe(voiceCallId);
      expect(res.body.status).toBe('ENDED');
      expect(res.body.endReason).toBe('COMPLETED');
      expect(res.body.endedAt).not.toBeNull();
      expect(res.body.endedByUserId).toBe(userIds[0]);
    });

    it('GET /api/v1/calls/current returns null after call ends', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/calls/current')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('lists ended call in cursor-paginated history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/calls/history')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .query({ conversationId, limit: 10 })
        .expect(200);

      expect(res.body.calls).toBeDefined();
      expect(res.body.calls.length).toBeGreaterThanOrEqual(1);
      expect(res.body.calls[0].id).toBe(voiceCallId);
    });
  });

  describe('4. Decline Flow & Video Call', () => {
    it('initiates a video call', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/calls')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({
          conversationId,
          type: 'VIDEO',
        })
        .expect(201);

      expect(res.body.type).toBe('VIDEO');
      expect(res.body.status).toBe('RINGING');
      videoCallId = res.body.id;
    });

    it('callee declines the video call, transitioning to ENDED with DECLINED reason', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/calls/${videoCallId}/decline`)
        .set('Authorization', `Bearer ${tokens[1]}`)
        .send({})
        .expect(200);

      expect(res.body.id).toBe(videoCallId);
      expect(res.body.status).toBe('ENDED');
      expect(res.body.endReason).toBe('DECLINED');
      expect(res.body.endedByUserId).toBe(userIds[1]);
    });
  });
});
