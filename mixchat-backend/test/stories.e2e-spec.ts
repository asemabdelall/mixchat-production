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
import {
  MediaKind,
  MediaStatus,
  StoryAudience,
  StoryReactionType,
} from '@prisma/client';

describe('Stories & Archive End-to-End (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;
  let mediaAId: string;
  let storyId: string;

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
    const uA = `story_a_${Date.now()}`;
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
    const uB = `story_b_${Date.now()}`;
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `${uB}@mixchat.app`,
        username: uB,
        password: 'Password123!',
      });
    userBToken = resB.body.accessToken;
    userBId = resB.body.user.id;

    // Create a READY MediaObject for User A
    const mediaObj = await prisma.mediaObject.create({
      data: {
        ownerId: userAId,
        objectKey: `stories/${uA}/test-image.webp`,
        originalFilename: 'test-image.webp',
        mimeType: 'image/webp',
        sizeBytes: BigInt(102400),
        kind: MediaKind.IMAGE,
        status: MediaStatus.READY,
        width: 1080,
        height: 1920,
      },
    });
    mediaAId = mediaObj.id;
  });

  afterAll(async () => {
    // Cleanup
    if (userAId || userBId) {
      await prisma.storyReply.deleteMany({
        where: { story: { authorId: { in: [userAId, userBId] } } },
      });
      await prisma.storyReaction.deleteMany({
        where: { story: { authorId: { in: [userAId, userBId] } } },
      });
      await prisma.storyView.deleteMany({
        where: { story: { authorId: { in: [userAId, userBId] } } },
      });
      await prisma.story.deleteMany({
        where: { authorId: { in: [userAId, userBId] } },
      });
      await prisma.mediaObject.deleteMany({
        where: { ownerId: { in: [userAId, userBId] } },
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

  it('POST /api/stories - User A creates a 24h story', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/stories')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        mediaObjectId: mediaAId,
        caption: 'Sunset in Santorini 🌅',
        audience: StoryAudience.PUBLIC,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.author.id).toBe(userAId);
    expect(res.body.caption).toBe('Sunset in Santorini 🌅');
    expect(res.body.media.url).toBeDefined();
    storyId = res.body.id;
  });

  it('GET /api/stories/active - User B sees User A story in active tray', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/stories/active')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    expect(res.body.groups).toBeDefined();
    const groupA = res.body.groups.find((g: any) => g.author.id === userAId);
    expect(groupA).toBeDefined();
    expect(groupA.hasUnseen).toBe(true);
    expect(groupA.stories.length).toBeGreaterThanOrEqual(1);
  });

  it('PUT /api/stories/:id/view - User B views User A story', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/stories/${storyId}/view`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    // Duplicate view (idempotency check)
    await request(app.getHttpServer())
      .put(`/api/v1/stories/${storyId}/view`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);
  });

  it('GET /api/stories/:id/viewers - User A sees User B in viewers list', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/stories/${storyId}/viewers`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].id).toBe(userBId);
    expect(res.body.totalCount).toBe(1);
  });

  it('GET /api/stories/:id/viewers - User B cannot view User A viewers list (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/stories/${storyId}/viewers`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(403);
  });

  it('PUT /api/stories/:id/reaction - User B reacts with HEART', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/stories/${storyId}/reaction`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ reaction: StoryReactionType.HEART })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.reaction).toBe(StoryReactionType.HEART);
  });

  it('POST /api/stories/:id/replies - User B sends a reply', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/stories/${storyId}/replies`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ content: 'Wish I was there! 😍' })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.content).toBe('Wish I was there! 😍');
    expect(res.body.sender.id).toBe(userBId);
  });

  it('GET /api/stories/archive - User A can view Story Archive', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/stories/archive')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].id).toBe(storyId);
    expect(res.body.items[0].viewsCount).toBe(1);
  });

  it('DELETE /api/stories/:id - User A deletes own story', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/stories/${storyId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    // Active feed no longer shows deleted story
    const res = await request(app.getHttpServer())
      .get('/api/v1/stories/active')
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);

    const groupA = res.body.groups.find((g: any) => g.author.id === userAId);
    expect(groupA).toBeUndefined();
  });
});
