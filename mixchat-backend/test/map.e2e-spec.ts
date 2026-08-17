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
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { MapService } from '../src/modules/map/map.service';
import { LocationVisibility } from '@prisma/client';

describe('Snap Map & Location Privacy End-to-End (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;

  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;
  let userCToken: string;
  let userCId: string;

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
    redisService = app.get<RedisService>(RedisService);

    // Register User A (Sharer)
    const uA = `map_a_${Date.now()}`;
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `${uA}@mixchat.app`,
        username: uA,
        password: 'Password123!',
      });
    userAToken = resA.body.accessToken;
    userAId = resA.body.user.id;

    // Register User B (Friend of A)
    const uB = `map_b_${Date.now()}`;
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `${uB}@mixchat.app`,
        username: uB,
        password: 'Password123!',
      });
    userBToken = resB.body.accessToken;
    userBId = resB.body.user.id;

    // Register User C (Stranger / Non-friend)
    const uC = `map_c_${Date.now()}`;
    const resC = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `${uC}@mixchat.app`,
        username: uC,
        password: 'Password123!',
      });
    userCToken = resC.body.accessToken;
    userCId = resC.body.user.id;

    // User B follows User A
    await prisma.follow.create({
      data: {
        followerId: userBId,
        followingId: userAId,
      },
    });
  });

  afterAll(async () => {
    if (userAId || userBId || userCId) {
      const userIds = [userAId, userBId, userCId].filter(Boolean);
      await prisma.userLocationSettings.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: { in: userIds } },
            { followingId: { in: userIds } },
          ],
        },
      });
      await prisma.block.deleteMany({
        where: {
          OR: [{ blockerId: { in: userIds } }, { blockedId: { in: userIds } }],
        },
      });
      await prisma.authSession.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });

      // Clear test keys in Redis
      const client = redisService.getClient();
      for (const uid of userIds) {
        await client.del(`${MapService.LOCATION_REDIS_PREFIX}:${uid}`);
      }
    }
    await app.close();
  });

  describe('Location Settings & Ghost Mode', () => {
    it('GET /api/v1/map/settings should return default Ghost Mode true for new user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/map/settings')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.isGhostMode).toBe(true);
      expect(res.body.visibility).toBe('FRIENDS');
    });

    it('PATCH /api/v1/map/settings should update Ghost Mode and visibility', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/map/settings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          isGhostMode: false,
          visibility: LocationVisibility.FRIENDS,
        })
        .expect(200);

      expect(res.body.isGhostMode).toBe(false);
      expect(res.body.visibility).toBe('FRIENDS');
    });
  });

  describe('Location Upload & Validation', () => {
    it('PUT /api/v1/map/location should reject invalid latitude', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/map/location')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          latitude: 95.0, // Invalid > 90
          longitude: -122.4194,
        })
        .expect(400);
    });

    it('PUT /api/v1/map/location should reject invalid longitude', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/map/location')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          latitude: 37.7749,
          longitude: 200.0, // Invalid > 180
        })
        .expect(400);
    });

    it('PUT /api/v1/map/location should accept valid coordinates and store in Redis with TTL', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/map/location')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 12.5,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.isGhostMode).toBe(false);

      // Verify Redis presence & TTL
      const client = redisService.getClient();
      const raw = await client.get(
        `${MapService.LOCATION_REDIS_PREFIX}:${userAId}`,
      );
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.latitude).toBe(37.7749);
      expect(parsed.longitude).toBe(-122.4194);

      const ttl = await client.ttl(
        `${MapService.LOCATION_REDIS_PREFIX}:${userAId}`,
      );
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(MapService.LOCATION_TTL_SECONDS);
    });
  });

  describe('Friends Map Query & Social Privacy', () => {
    it('GET /api/v1/map/friends should return User A for followed friend User B', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/map/friends')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(res.headers['cache-control']).toContain('private, no-store');
      expect(res.body.friends).toBeInstanceOf(Array);
      const friendA = res.body.friends.find((f: any) => f.user.id === userAId);
      expect(friendA).toBeDefined();
      expect(friendA.location.latitude).toBe(37.7749);
      expect(friendA.location.longitude).toBe(-122.4194);
    });

    it('GET /api/v1/map/friends should NOT return User A for stranger User C', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/map/friends')
        .set('Authorization', `Bearer ${userCToken}`)
        .expect(200);

      const friendA = res.body.friends.find((f: any) => f.user.id === userAId);
      expect(friendA).toBeUndefined();
    });

    it('GET /api/v1/map/friends should NOT return User A if User B is blocked by User A', async () => {
      // User A blocks User B
      await prisma.block.create({
        data: {
          blockerId: userAId,
          blockedId: userBId,
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/map/friends')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      const friendA = res.body.friends.find((f: any) => f.user.id === userAId);
      expect(friendA).toBeUndefined();

      // Cleanup block
      await prisma.block.deleteMany({
        where: { blockerId: userAId, blockedId: userBId },
      });
    });
  });

  describe('Ghost Mode Instant Effect & Location Deletion', () => {
    it('PATCH /api/v1/map/settings with isGhostMode=true should delete coordinates from Redis', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/map/settings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ isGhostMode: true })
        .expect(200);

      // Verify Redis key was deleted
      const client = redisService.getClient();
      const raw = await client.get(
        `${MapService.LOCATION_REDIS_PREFIX}:${userAId}`,
      );
      expect(raw).toBeNull();

      // User B should no longer see User A
      const res = await request(app.getHttpServer())
        .get('/api/v1/map/friends')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      const friendA = res.body.friends.find((f: any) => f.user.id === userAId);
      expect(friendA).toBeUndefined();
    });

    it('DELETE /api/v1/map/location should explicitly delete live coordinates', async () => {
      // Re-enable and upload
      await request(app.getHttpServer())
        .patch('/api/v1/map/settings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ isGhostMode: false })
        .expect(200);

      await request(app.getHttpServer())
        .put('/api/v1/map/location')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ latitude: 37.78, longitude: -122.42 })
        .expect(200);

      // Delete
      const res = await request(app.getHttpServer())
        .delete('/api/v1/map/location')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const client = redisService.getClient();
      const raw = await client.get(
        `${MapService.LOCATION_REDIS_PREFIX}:${userAId}`,
      );
      expect(raw).toBeNull();
    });
  });
});
