import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import cookieParser from 'cookie-parser';

describe('Notifications & Web Push Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    await app.init();
    prisma = app.get(PrismaService);

    const timestamp = Date.now();
    // Register User A
    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `notif_a_${timestamp}@mixchat.app`,
        username: `notif_a_${timestamp}`.slice(0, 28),
        password: 'Password123!',
      })
      .expect(201);
    userAToken = regA.body.accessToken;
    userAId = regA.body.user.id;

    // Register User B
    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `notif_b_${timestamp}@mixchat.app`,
        username: `notif_b_${timestamp}`.slice(0, 28),
        password: 'Password123!',
      })
      .expect(201);
    userBToken = regB.body.accessToken;
    userBId = regB.body.user.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.pushSubscription.deleteMany({
        where: { userId: { in: [userAId, userBId] } },
      });
      await prisma.notificationPreferences.deleteMany({
        where: { userId: { in: [userAId, userBId] } },
      });
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { recipientId: { in: [userAId, userBId] } },
            { actorId: { in: [userAId, userBId] } },
          ],
        },
      });
      await prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: userAId },
            { followerId: userBId },
            { followingId: userAId },
            { followingId: userBId },
          ],
        },
      });
      await prisma.comment.deleteMany({
        where: { authorId: { in: [userAId, userBId] } },
      });
      await prisma.reel.deleteMany({
        where: { authorId: { in: [userAId, userBId] } },
      });
      await prisma.mediaObject.deleteMany({
        where: { ownerId: { in: [userAId, userBId] } },
      });
      await prisma.message.deleteMany({
        where: { senderId: { in: [userAId, userBId] } },
      });
      await prisma.conversationParticipant.deleteMany({
        where: { userId: { in: [userAId, userBId] } },
      });
      await prisma.conversation.deleteMany({
        where: {
          participants: {
            none: {},
          },
        },
      });
      await prisma.authSession.deleteMany({
        where: { userId: { in: [userAId, userBId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userAId, userBId] } },
      });
    }
    await app.close();
  });

  it('1. GET /api/v1/push/vapid-public-key -> returns configured VAPID public key', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/push/vapid-public-key')
      .expect(200);

    expect(res.body).toHaveProperty('publicKey');
    expect(typeof res.body.publicKey).toBe('string');
    expect(res.body.publicKey.length).toBeGreaterThan(10);
  });

  it('2. GET /api/v1/notifications/preferences -> returns default preferences', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      pushEnabled: true,
      socialPush: true,
      likesPush: true,
      commentsPush: true,
      mentionsPush: true,
      messagesPush: true,
      showMessagePreview: true,
    });
  });

  it('3. PATCH /api/v1/notifications/preferences -> updates preferences', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        likesPush: false,
        showMessagePreview: false,
      })
      .expect(200);

    expect(res.body.likesPush).toBe(false);
    expect(res.body.showMessagePreview).toBe(false);
    expect(res.body.messagesPush).toBe(true);
  });

  it('4. POST /api/v1/push/subscriptions -> registers browser subscription', async () => {
    const mockEndpoint = `https://fcm.googleapis.com/fcm/send/test_sub_${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/push/subscriptions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        endpoint: mockEndpoint,
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVJa',
          auth: 'tBHItJI5svbpez7KI4CCXg',
        },
        userAgent: 'Jest E2E Test Browser',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.id).toBeDefined();

    // Revoke
    const delRes = await request(app.getHttpServer())
      .delete('/api/v1/push/subscriptions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        endpoint: mockEndpoint,
      })
      .expect(200);

    expect(delRes.body.success).toBe(true);
  });

  it('5. GET /api/v1/notifications/unread-count -> should return 0 initially', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(res.body).toEqual({ unreadCount: 0 });
  });

  it('6. User A follows User B -> creates notification for User B', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/social/follow/${userBId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    const countRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(countRes.body.unreadCount).toBe(1);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.items[0].type).toBe('FOLLOW');
    expect(listRes.body.items[0].actor.id).toBe(userAId);
    expect(listRes.body.unreadCount).toBe(1);
  });

  it('7. PATCH /api/v1/notifications/:id/read -> marks single notification as read', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    const notifId = listRes.body.items[0].id;

    const readRes = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(readRes.body.unreadCount).toBe(0);

    const countRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(countRes.body.unreadCount).toBe(0);
  });

  it('8. PATCH /api/v1/notifications/read-all -> marks all notifications as read', async () => {
    // Create another notification by User B following User A
    await request(app.getHttpServer())
      .post(`/api/v1/social/follow/${userAId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    const countRes = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(countRes.body.unreadCount).toBe(1);

    const readAllRes = await request(app.getHttpServer())
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(readAllRes.body.unreadCount).toBe(0);
  });

  it('9. User A sends message in direct conversation -> creates MESSAGE_NEW notification for User B', async () => {
    // Create direct conversation
    const convRes = await request(app.getHttpServer())
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'DIRECT',
        targetUserId: userBId,
      })
      .expect(201);

    const convId = convRes.body.id;

    // Send message from User A
    await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        type: 'TEXT',
        text: 'Hello from User A e2e test',
        clientMessageId: `e2e-msg-${Date.now()}`,
      })
      .expect(201);

    // Verify User B receives notification
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    const messageNotif = listRes.body.items.find(
      (n: any) => n.type === 'MESSAGE_NEW',
    );
    expect(messageNotif).toBeDefined();
    expect(messageNotif.actor.id).toBe(userAId);
    expect(messageNotif.entityId).toBe(convId);
    expect(messageNotif.targetUrl).toBe('/chat');
  });

  it("10. User A comments on User B's Reel -> creates REEL_COMMENT notification for User B", async () => {
    const key = `reels/test-${Date.now()}.mp4`;
    const media = await prisma.mediaObject.create({
      data: {
        ownerId: userBId,
        objectKey: key,
        originalFilename: 'test.mp4',
        mimeType: 'video/mp4',
        kind: 'VIDEO',
        sizeBytes: BigInt(1024),
        status: 'READY',
      },
    });

    const reel = await prisma.reel.create({
      data: {
        authorId: userBId,
        mediaObjectId: media.id,
        caption: 'Test reel for notifications',
      },
    });

    // User A comments on User B's reel
    await request(app.getHttpServer())
      .post(`/api/v1/reels/${reel.id}/comments`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        content: 'Amazing reel! 🔥',
      })
      .expect(201);

    // Verify User B receives REEL_COMMENT notification
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    const reelNotif = listRes.body.items.find(
      (n: any) => n.type === 'REEL_COMMENT',
    );
    expect(reelNotif).toBeDefined();
    expect(reelNotif.actor.id).toBe(userAId);
    expect(reelNotif.entityId).toBe(reel.id);
    expect(reelNotif.targetUrl).toBe(`/reels?id=${reel.id}`);
  });
});
