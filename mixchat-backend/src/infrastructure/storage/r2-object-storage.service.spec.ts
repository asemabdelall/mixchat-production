import { Test, TestingModule } from '@nestjs/testing';
import { R2ObjectStorage } from './r2-object-storage.service';
import { ConfigService } from '@nestjs/config';

describe('R2ObjectStorage', () => {
  let storage: R2ObjectStorage;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'storage.accountId') return 'test_account_123';
        if (key === 'storage.accessKeyId') return 'test_access_key';
        if (key === 'storage.secretAccessKey') return 'test_secret_key';
        if (key === 'storage.bucket') return 'test-bucket';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        R2ObjectStorage,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    storage = module.get<R2ObjectStorage>(R2ObjectStorage);
  });

  it('should initialize S3Client with region auto and correct R2 endpoint', () => {
    expect(storage.getClient()).toBeDefined();
    expect(storage.isStorageConfigured()).toBe(true);
  });

  it('should generate presigned PUT url with given bucket, key and content type', async () => {
    const url = await storage.createPresignedPutUrl({
      bucket: 'test-bucket',
      key: 'users/123/media/test.png',
      contentType: 'image/png',
      expiresInSeconds: 900,
    });

    expect(typeof url).toBe('string');
    expect(url).toContain('test_account_123.r2.cloudflarestorage.com');
    expect(url).toContain('test-bucket');
    expect(url).toContain('test.png');
    expect(url).toContain('X-Amz-Signature');
  });

  it('should generate a valid presigned GET url', async () => {
    const url = await storage.createPresignedGetUrl({
      bucket: 'test-bucket',
      key: 'test-key.png',
      expiresInSeconds: 3600,
    });

    expect(url).toBeDefined();
    expect(url).toContain('test_account_123.r2.cloudflarestorage.com');
    expect(url).toContain('test-bucket');
    expect(url).toContain('test-key.png');
  });

  it('should return null when object is not found in headObject', async () => {
    const notFoundError = new Error('NotFound');
    notFoundError.name = 'NotFound';
    Object.assign(notFoundError, { $metadata: { httpStatusCode: 404 } });

    jest
      .spyOn(storage.getClient(), 'send')
      .mockRejectedValue(notFoundError as never);

    const meta = await storage.headObject('test-bucket', 'nonexistent.png');
    expect(meta).toBeNull();
  });

  it('should return metadata when object is found in headObject', async () => {
    const mockOutput = {
      ContentLength: 1024,
      ContentType: 'image/png',
      ETag: '"etag123"',
      LastModified: new Date(),
    };

    jest
      .spyOn(storage.getClient(), 'send')
      .mockResolvedValue(mockOutput as never);

    const meta = await storage.headObject('test-bucket', 'existing.png');
    expect(meta).toBeDefined();
    expect(meta?.contentLength).toBe(1024);
    expect(meta?.contentType).toBe('image/png');
    expect(meta?.etag).toBe('"etag123"');
  });

  it('should tolerate NotFound on deleteObject idempotently', async () => {
    const notFoundError = new Error('NotFound');
    notFoundError.name = 'NotFound';
    Object.assign(notFoundError, { $metadata: { httpStatusCode: 404 } });

    jest
      .spyOn(storage.getClient(), 'send')
      .mockRejectedValue(notFoundError as never);

    await expect(
      storage.deleteObject('test-bucket', 'already-deleted.png'),
    ).resolves.toBeUndefined();
  });
});
