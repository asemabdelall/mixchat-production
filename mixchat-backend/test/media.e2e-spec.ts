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
import { ObjectStorage } from '../src/infrastructure/storage/object-storage.abstract';

interface AuthResponseBody {
  user: {
    id: string;
    email: string;
    username: string;
  };
  accessToken: string;
}

interface UploadIntentBody {
  media: {
    id: string;
    objectKey: string;
    status: string;
    kind: string;
    mimeType: string;
  };
  upload: {
    url: string;
    method: string;
    headers: Record<string, string>;
    expiresAt: string;
  };
}

interface MediaObjectBody {
  id: string;
  status: string;
  etag?: string;
  width?: number;
  height?: number;
}

describe('Media Platform & Cloudflare R2 Uploads (e2e)', () => {
  let app: INestApplication<App>;
  let mockStorage: {
    createPresignedPutUrl: jest.Mock;
    headObject: jest.Mock;
    deleteObject: jest.Mock;
    objectExists: jest.Mock;
  };

  const timestamp = Date.now();
  const user = {
    email: `media_user_${timestamp}@mixchat.app`,
    username: `media_user_${timestamp}`,
    password: 'Password123!',
  };

  let token: string;
  let userId: string;

  beforeAll(async () => {
    mockStorage = {
      createPresignedPutUrl: jest
        .fn()
        .mockResolvedValue('https://fake.r2.cloudflarestorage.com/signed-put'),
      headObject: jest.fn().mockResolvedValue({
        contentLength: 1024,
        contentType: 'image/png',
        etag: '"e2e_etag_123"',
      }),
      deleteObject: jest.fn().mockResolvedValue(undefined),
      objectExists: jest.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ObjectStorage)
      .useValue(mockStorage)
      .compile();

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

    // Register test user
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(user)
      .expect(201);

    const body = regRes.body as AuthResponseBody;
    token = body.accessToken;
    userId = body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/media/upload-intents should require authentication', () => {
    return request(app.getHttpServer())
      .post('/api/v1/media/upload-intents')
      .send({
        filename: 'avatar.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
        kind: 'IMAGE',
      })
      .expect(401);
  });

  it('POST /api/media/upload-intents should reject invalid MIME type', () => {
    return request(app.getHttpServer())
      .post('/api/v1/media/upload-intents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        filename: 'hack.html',
        mimeType: 'text/html',
        sizeBytes: 1024,
        kind: 'IMAGE',
      })
      .expect(400);
  });

  let createdMediaId: string;

  it('POST /api/media/upload-intents should return PENDING media and presigned PUT URL', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/media/upload-intents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        filename: 'my_avatar.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        kind: 'IMAGE',
      })
      .expect(201);

    const body = res.body as UploadIntentBody;
    expect(body.media.id).toBeDefined();
    expect(body.media.status).toBe('PENDING');
    expect(body.media.objectKey).toContain(`users/${userId}/media/`);
    expect(body.upload.url).toBe(
      'https://fake.r2.cloudflarestorage.com/signed-put',
    );
    expect(body.upload.method).toBe('PUT');
    expect(body.upload.headers['Content-Type']).toBe('image/png');

    createdMediaId = body.media.id;
  });

  it('POST /api/media/:id/complete should verify R2 and transition to READY', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/media/${createdMediaId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        width: 1080,
        height: 1080,
      })
      .expect(200);

    const body = res.body as MediaObjectBody;
    expect(body.id).toBe(createdMediaId);
    expect(body.status).toBe('READY');
    expect(body.etag).toBe('"e2e_etag_123"');
    expect(body.width).toBe(1080);
    expect(body.height).toBe(1080);
  });

  it('DELETE /api/media/:id should delete object from storage and database', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/media/${createdMediaId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Verify deletion
    await request(app.getHttpServer())
      .post(`/api/v1/media/${createdMediaId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(404);
  });
});
