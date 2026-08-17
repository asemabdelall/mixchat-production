import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface LivenessBody {
  status: string;
  uptime: number;
  timestamp: string;
}

interface ReadinessBody {
  status: string;
  dependencies: {
    database: boolean;
    redis: boolean;
  };
  timestamp: string;
}

describe('Health & Application (e2e)', () => {
  let app: INestApplication<App>;

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
    await app.init();
  });

  it('/api/health (GET) should return 200 ok liveness on neutral path', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as LivenessBody;
        expect(body.status).toBe('ok');
        expect(typeof body.uptime).toBe('number');
        expect(typeof body.timestamp).toBe('string');
      });
  });

  it('/api/v1/health (GET) should return 200 ok liveness on v1 path', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as LivenessBody;
        expect(body.status).toBe('ok');
        expect(typeof body.uptime).toBe('number');
        expect(typeof body.timestamp).toBe('string');
      });
  });

  it('/api/health/ready (GET) should return 200 ok when PostgreSQL and Redis are connected', () => {
    return request(app.getHttpServer())
      .get('/api/health/ready')
      .expect(200)
      .expect((res) => {
        const body = res.body as ReadinessBody;
        expect(body.status).toBe('ok');
        expect(body.dependencies.database).toBe(true);
        expect(body.dependencies.redis).toBe(true);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
