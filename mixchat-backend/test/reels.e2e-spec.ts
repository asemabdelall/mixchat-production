import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { MediaKind, MediaStatus, PostVisibility } from '@prisma/client';

describe('Reels & Vertical Video Feed End-to-End (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;
  let videoMediaId: string;
  let posterMediaId: string;
  let createdReelId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Register User A
    const uA = `reel_a_${Date.now()}`;
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `${uA}@mixchat.app`,
        username: uA,
        password: 'Password123!',
      });
    userAToken = resA.body.accessToken;
    userAId = resA.body.user.id;

    // Register User B
    const uB = `reel_b_${Date.now()}`;
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `${uB}@mixchat.app`,
        username: uB,
        password: 'Password123!',
      });
    userBToken = resB.body.accessToken;
    userBId = resB.body.user.id;

    // Create a READY video MediaObject for User A
    const videoObj = await prisma.mediaObject.create({
      data: {
        ownerId: userAId,
        objectKey: `reels/${uA}/test-video.mp4`,
        originalFilename: 'test-video.mp4',
        mimeType: 'video/mp4',
        sizeBytes: BigInt(5242880),
        kind: MediaKind.VIDEO,
        status: MediaStatus.READY,
        width: 1080,
        height: 1920,
        durationMs: 15000,
      },
    });
    videoMediaId = videoObj.id;

    // Create a READY poster MediaObject for User A
    const posterObj = await prisma.mediaObject.create({
      data: {
        ownerId: userAId,
        objectKey: `reels/${uA}/poster.jpg`,
        originalFilename: 'poster.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: BigInt(102400),
        kind: MediaKind.IMAGE,
        status: MediaStatus.READY,
        width: 1080,
        height: 1920,
      },
    });
    posterMediaId = posterObj.id;
  });

  afterAll(async () => {
    // Cleanup
    if (userAId || userBId) {
      await prisma.commentLike.deleteMany({
        where: { comment: { reel: { authorId: { in: [userAId, userBId] } } } },
      });
      await prisma.commentMention.deleteMany({
        where: { comment: { reel: { authorId: { in: [userAId, userBId] } } } },
      });
      await prisma.comment.deleteMany({
        where: { reel: { authorId: { in: [userAId, userBId] } } },
      });
      await prisma.reelWatchSession.deleteMany({
        where: { reel: { authorId: { in: [userAId, userBId] } } },
      });
      await prisma.reelLike.deleteMany({
        where: { reel: { authorId: { in: [userAId, userBId] } } },
      });
      await prisma.reelBookmark.deleteMany({
        where: { reel: { authorId: { in: [userAId, userBId] } } },
      });
      await prisma.reel.deleteMany({
        where: { authorId: { in: [userAId, userBId] } },
      });
      await prisma.mediaObject.deleteMany({
        where: { ownerId: { in: [userAId, userBId] } },
      });
      await prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: { in: [userAId, userBId] } },
            { followingId: { in: [userAId, userBId] } },
          ],
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

  it('POST /api/reels - User A creates a vertical reel', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/reels')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        mediaObjectId: videoMediaId,
        posterMediaObjectId: posterMediaId,
        caption: 'Awesome sunset clip #sunset #vibes',
        audioTitle: 'Original Audio - User A',
        locationTag: 'Malibu, CA',
        visibility: PostVisibility.PUBLIC,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.author.id).toBe(userAId);
    expect(res.body.video.url).toBeDefined();
    expect(res.body.caption).toContain('#sunset');
    createdReelId = res.body.id;
  });

  it('GET /api/reels - User B retrieves For You feed', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reels?feed=foryou&limit=10')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(res.body.items).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
    const found = res.body.items.find((r: any) => r.id === createdReelId);
    expect(found).toBeDefined();
    expect(found.viewerState.hasLiked).toBe(false);
  });

  it('PUT /api/reels/:id/like - User B likes the reel', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/reels/${createdReelId}/like`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(res.body.liked).toBe(true);
    expect(res.body.likesCount).toBe(1);
  });

  it('PUT /api/reels/:id/bookmark - User B bookmarks the reel', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/reels/${createdReelId}/bookmark`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(res.body.bookmarked).toBe(true);
    expect(res.body.bookmarksCount).toBe(1);
  });

  it('POST /api/reels/:id/comments - User B comments on the reel', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/reels/${createdReelId}/comments`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        content: 'Incredible colors! 🔥',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.reelId).toBe(createdReelId);
    expect(res.body.content).toBe('Incredible colors! 🔥');
  });

  it('GET /api/reels/:id/comments - User B fetches reel comments', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reels/${createdReelId}/comments`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].content).toBe('Incredible colors! 🔥');
  });

  it('Watch telemetry: start, progress, qualified view & end', async () => {
    const sessionId = `test_sess_${Date.now()}`;

    // 1. Start watch
    await request(app.getHttpServer())
      .post(`/api/v1/reels/${createdReelId}/watch/start`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ sessionId })
      .expect(200);

    // 2. Progress (>2000ms qualifies view)
    const progRes = await request(app.getHttpServer())
      .patch(`/api/v1/reels/${createdReelId}/watch/progress`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        sessionId,
        watchedMs: 3500,
        maxProgressMs: 3500,
        durationMs: 15000,
        completionRatio: 0.23,
      })
      .expect(200);

    expect(progRes.body.isQualifiedView).toBe(true);

    // 3. End session
    const endRes = await request(app.getHttpServer())
      .post(`/api/v1/reels/${createdReelId}/watch/end`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        sessionId,
        watchedMs: 14000,
        maxProgressMs: 14000,
        durationMs: 15000,
        completionRatio: 0.93,
        isCompleted: true,
      })
      .expect(200);

    expect(endRes.body.isCompleted).toBe(true);
  });

  it('GET /api/reels/:id - User B gets single reel details with updated stats', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reels/${createdReelId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdReelId);
    expect(res.body.counts.likesCount).toBe(1);
    expect(res.body.counts.bookmarksCount).toBe(1);
    expect(res.body.counts.commentsCount).toBe(1);
    expect(res.body.counts.viewsCount).toBe(1);
    expect(res.body.viewerState.hasLiked).toBe(true);
    expect(res.body.viewerState.hasBookmarked).toBe(true);
  });

  it('DELETE /api/reels/:id - User A deletes their reel', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/reels/${createdReelId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    // Should now return 404
    await request(app.getHttpServer())
      .get(`/api/v1/reels/${createdReelId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(404);
  });
});
