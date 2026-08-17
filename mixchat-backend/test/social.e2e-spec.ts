import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

interface AuthResponseBody {
  user: {
    id: string;
    email: string;
    username: string;
  };
  accessToken: string;
}

interface FollowRequestsBody {
  items: Array<{ id: string; requesterId: string; username: string }>;
  totalCount: number;
}

interface PublicProfileBody {
  id: string;
  username: string;
  displayName: string;
  isPrivate: boolean;
  relationshipState: string;
  followersCount: number;
}

describe('Users, Profiles, Social Graph & Privacy (e2e)', () => {
  let app: INestApplication<App>;

  const rand = Math.random().toString(36).substring(2, 7);
  const timestamp = Date.now();
  const userA = {
    email: `alex_${timestamp}_${rand}@mixchat.app`,
    username: `alex_${timestamp}_${rand}`,
    password: 'Password123!',
  };
  const userB = {
    email: `sam_${timestamp}_${rand}@mixchat.app`,
    username: `sam_${timestamp}_${rand}`,
    password: 'Password123!',
  };

  let tokenA: string;
  let userAId: string;
  let tokenB: string;
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
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    // Register User A
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userA)
      .expect(201);
    const bodyA = resA.body as AuthResponseBody;
    tokenA = bodyA.accessToken;
    userAId = bodyA.user.id;

    // Register User B
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userB)
      .expect(201);
    const bodyB = resB.body as AuthResponseBody;
    tokenB = bodyB.accessToken;
    userBId = bodyB.user.id;
  });

  it('PATCH /api/users/me should update own profile fields', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        displayName: 'Alex Vance Creator',
        bio: 'Building MixChat ecosystem',
        website: 'https://mixchat.app',
      })
      .expect(200);

    const body = res.body as {
      displayName: string;
      bio: string;
      website: string;
    };
    expect(body.displayName).toBe('Alex Vance Creator');
    expect(body.bio).toBe('Building MixChat ecosystem');
    expect(body.website).toBe('https://mixchat.app');
  });

  it('PATCH /api/users/me should allow setting account to Private', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ isPrivate: true })
      .expect(200);

    const body = res.body as { isPrivate: boolean };
    expect(body.isPrivate).toBe(true);
  });

  it('GET /api/users/search should find user B by username', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/users/search?q=${userB.username}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const items = res.body as Array<{ id: string; username: string }>;
    expect(items.some((u) => u.username === userB.username)).toBe(true);
  });

  it('POST /api/social/follow/:id on private user should create FollowRequest', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/social/follow/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const body = res.body as { relationshipState: string };
    expect(body.relationshipState).toBe('REQUESTED');
  });

  it('GET /api/social/follow-requests should show pending request to user B', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/social/follow-requests')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const body = res.body as FollowRequestsBody;
    expect(body.totalCount).toBeGreaterThanOrEqual(1);
    const foundReq = body.items.find((r) => r.requesterId === userAId);
    expect(foundReq).toBeDefined();

    // Accept the request
    await request(app.getHttpServer())
      .post(`/api/v1/social/follow-requests/${foundReq!.id}/accept`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
  });

  it('GET /api/users/by-username/:username should now show FOLLOWING and followersCount 1', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/users/by-username/${userB.username}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const body = res.body as PublicProfileBody;
    expect(body.relationshipState).toBe('FOLLOWING');
    expect(body.followersCount).toBe(1);
  });

  it('POST /api/social/close-friends/:id and GET /api/social/close-friends', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/social/close-friends/${userAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/v1/social/close-friends')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const body = res.body as { items: Array<{ id: string }> };
    expect(body.items.some((item) => item.id === userAId)).toBe(true);
  });

  it('POST /api/social/block/:id should block user and atomically clean connections', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/social/block/${userAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    // Profile of B viewed by A must now return 404
    await request(app.getHttpServer())
      .get(`/api/v1/users/by-username/${userB.username}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);

    // User A should no longer be in Close Friends of B
    const cfRes = await request(app.getHttpServer())
      .get('/api/v1/social/close-friends')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    const cfBody = cfRes.body as { items: Array<{ id: string }> };
    expect(cfBody.items.some((item) => item.id === userAId)).toBe(false);
  });

  afterAll(async () => {
    await app.close();
  });
});
