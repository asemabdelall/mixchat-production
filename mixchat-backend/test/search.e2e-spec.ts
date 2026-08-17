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

describe('Universal Search & Algorithmic Discovery (e2e)', () => {
  let app: INestApplication<App>;

  const timestamp = Date.now();
  const searchUserA = {
    email: `search_alice_${timestamp}@mixchat.app`,
    username: `searchalice_${timestamp}`,
    password: 'Password123!',
  };
  const searchUserB = {
    email: `search_bob_${timestamp}@mixchat.app`,
    username: `searchbob_${timestamp}`,
    password: 'Password123!',
  };

  let tokenA: string;
  let tokenB: string;

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
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    // Register Users
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(searchUserA);
    tokenA = (resA.body as AuthResponseBody).accessToken;

    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(searchUserB);
    tokenB = (resB.body as AuthResponseBody).accessToken;

    // Create a Post with a specific hashtag
    await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        content: `Exploring futuristic UI on MixChat with #CyberWave and #NextGenSearch ${timestamp}`,
        visibility: 'PUBLIC',
      });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/search/universal — searches users by prefix & exact query', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/search/universal?q=searchalice_${timestamp}&type=users`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toBeDefined();
    expect(res.body.users.length).toBeGreaterThanOrEqual(1);
    expect(res.body.users[0].username).toBe(`searchalice_${timestamp}`);
  });

  it('2. GET /api/search/universal — searches posts containing hashtag and keyword', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/search/universal?q=CyberWave&type=posts`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toBeDefined();
    expect(res.body.posts.length).toBeGreaterThanOrEqual(1);
    expect(res.body.posts[0].content).toContain('#CyberWave');
  });

  it('3. GET /api/search/trending — dynamic trending topics calculated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/search/trending')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('4. GET /api/search/explore — returns algorithmic explore feed', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/search/explore?limit=10')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.pageInfo).toBeDefined();
  });

  it('5. Recent Searches — Add, Get, Delete and Clear history', async () => {
    // Add search term
    const addRes = await request(app.getHttpServer())
      .post('/api/v1/search/recent')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ term: 'futuristic design' });
    expect(addRes.status).toBe(200);

    // Get search terms
    const getRes = await request(app.getHttpServer())
      .get('/api/v1/search/recent')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.items).toContain('futuristic design');

    // Delete single term
    const delRes = await request(app.getHttpServer())
      .delete('/api/v1/search/recent/futuristic%20design')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(delRes.status).toBe(200);

    // Clear all
    const clearRes = await request(app.getHttpServer())
      .delete('/api/v1/search/recent')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(clearRes.status).toBe(200);
  });
});
