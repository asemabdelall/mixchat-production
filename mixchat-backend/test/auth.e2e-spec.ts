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
    role: string;
    status: string;
  };
  accessToken: string;
}

interface GenericSuccessBody {
  success: boolean;
  message: string;
}

describe('Auth & Session Lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  const testUser = {
    email: `e2e_${Date.now()}@mixchat.app`,
    username: `e2e_user_${Date.now()}`,
    password: 'SuperSecretE2EPassword123!',
  };

  let accessToken: string;
  let refreshCookie: string;

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
  });

  it('POST /api/v1/auth/register should register a user and return tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    const body = res.body as AuthResponseBody;
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(testUser.email.toLowerCase());
    expect(body.user.username).toBe(testUser.username.toLowerCase());
    expect(body.accessToken).toBeDefined();
    accessToken = body.accessToken;

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c: string) =>
      c.startsWith('mixchat_refresh_token='),
    );
    expect(tokenCookie).toBeDefined();
    refreshCookie = tokenCookie as string;
  });

  it('POST /api/v1/auth/register should reject duplicate registration with 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(409);
  });

  it('POST /api/v1/auth/login should authenticate credentials and issue tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: testUser.username,
        password: testUser.password,
      })
      .expect(200);

    const body = res.body as AuthResponseBody;
    expect(body.accessToken).toBeDefined();
    accessToken = body.accessToken;

    const cookies = res.get('Set-Cookie') || [];
    const foundCookie = cookies.find((c) =>
      c.includes('mixchat_refresh_token'),
    );
    expect(foundCookie).toBeDefined();
    refreshCookie = foundCookie!.split(';')[0];
  });

  it('GET /api/auth/me should return current user when authenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as { email: string; username: string };
    expect(body.email).toBe(testUser.email.toLowerCase());
    expect(body.username).toBe(testUser.username.toLowerCase());
  });

  it('GET /api/auth/me should return 401 without access token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('GET /api/auth/sessions should list active sessions for user', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const sessions = res.body as Array<{ id: string; isCurrent: boolean }>;
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    expect(sessions.some((s) => s.isCurrent)).toBe(true);
  });

  it('POST /api/auth/refresh should rotate refresh token and return new access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [refreshCookie])
      .expect(200);

    const body = res.body as AuthResponseBody;
    expect(body.accessToken).toBeDefined();
    expect(body.accessToken).not.toBe(accessToken);

    accessToken = body.accessToken;
    const cookies = res.get('Set-Cookie') || [];
    const newCookie = cookies.find((c) => c.includes('mixchat_refresh_token'));
    expect(newCookie).toBeDefined();
    refreshCookie = newCookie!.split(';')[0];
  });

  it('POST /api/auth/logout should revoke session and clear cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', [refreshCookie])
      .expect(200);

    const body = res.body as GenericSuccessBody;
    expect(body.success).toBe(true);

    // Subsequent refresh with old cookie must fail
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [refreshCookie])
      .expect(401);
  });

  it('POST /api/auth/logout-all should revoke all user sessions', async () => {
    // Login session 1
    const login1 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: testUser.email, password: testUser.password })
      .expect(200);
    const body1 = login1.body as AuthResponseBody;
    const cookie1 = (login1.get('Set-Cookie') || [])
      .find((c) => c.includes('mixchat_refresh_token'))!
      .split(';')[0];

    // Login session 2
    const login2 = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: testUser.email, password: testUser.password })
      .expect(200);
    const cookie2 = (login2.get('Set-Cookie') || [])
      .find((c) => c.includes('mixchat_refresh_token'))!
      .split(';')[0];

    // Call logout-all with session 1
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${body1.accessToken}`)
      .expect(200);

    // Session 2 refresh should now be denied
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [cookie2])
      .expect(401);

    // Session 1 refresh should also be denied
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [cookie1])
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
