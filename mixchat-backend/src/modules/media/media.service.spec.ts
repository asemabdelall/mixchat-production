import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ObjectStorage } from '../../infrastructure/storage/object-storage.abstract';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MediaKind, MediaStatus } from '@prisma/client';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: {
    mediaObject: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let storage: {
    createPresignedPutUrl: jest.Mock;
    createPresignedGetUrl: jest.Mock;
    headObject: jest.Mock;
    deleteObject: jest.Mock;
    objectExists: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      mediaObject: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    storage = {
      createPresignedPutUrl: jest.fn(),
      createPresignedGetUrl: jest
        .fn()
        .mockResolvedValue('https://mock-storage.com/download'),
      headObject: jest.fn(),
      deleteObject: jest.fn(),
      objectExists: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'storage.bucket') return 'test-bucket';
        if (key === 'storage.publicBaseUrl') return 'https://media.test.com';
        if (key === 'media.uploadUrlTtlSeconds') return 900;
        if (key === 'media.maxImageBytes') return 10485760; // 10MB
        if (key === 'media.maxVideoBytes') return 104857600; // 100MB
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ObjectStorage, useValue: storage },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe('createUploadIntent', () => {
    it('should create a PENDING media record and return a signed PUT URL', async () => {
      const mockMedia = {
        id: 'media_123',
        ownerId: 'user_1',
        objectKey: 'users/user_1/media/2026/08/abc.png',
        originalFilename: 'avatar.png',
        mimeType: 'image/png',
        sizeBytes: BigInt(500000),
        kind: MediaKind.IMAGE,
        status: MediaStatus.PENDING,
        width: null,
        height: null,
        durationMs: null,
        etag: null,
        uploadedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.mediaObject.create.mockResolvedValue(mockMedia);
      storage.createPresignedPutUrl.mockResolvedValue(
        'https://r2.cloudflarestorage.com/signed-put-url',
      );

      const result = await service.createUploadIntent('user_1', {
        filename: 'avatar.png',
        mimeType: 'image/png',
        sizeBytes: 500000,
        kind: MediaKind.IMAGE,
      });

      expect(result.media.id).toBe('media_123');
      expect(result.media.status).toBe('PENDING');
      expect(result.media.publicUrl).toContain('https://media.test.com');
      expect(result.upload.url).toBe(
        'https://r2.cloudflarestorage.com/signed-put-url',
      );
      expect(result.upload.method).toBe('PUT');
      expect(result.upload.headers['Content-Type']).toBe('image/png');
    });

    it('should reject invalid or dangerous MIME types', async () => {
      await expect(
        service.createUploadIntent('user_1', {
          filename: 'script.html',
          mimeType: 'text/html',
          sizeBytes: 1000,
          kind: MediaKind.IMAGE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding max configured size', async () => {
      await expect(
        service.createUploadIntent('user_1', {
          filename: 'huge.png',
          mimeType: 'image/png',
          sizeBytes: 20 * 1024 * 1024, // 20MB > 10MB limit
          kind: MediaKind.IMAGE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept MediaRecorder audio MIME parameters for voice notes', async () => {
      const now = new Date();
      prisma.mediaObject.create.mockResolvedValue({
        id: 'voice_123',
        ownerId: 'user_1',
        objectKey: 'users/user_1/media/voice.webm',
        originalFilename: 'voice.webm',
        mimeType: 'audio/webm;codecs=opus',
        sizeBytes: BigInt(32000),
        kind: MediaKind.AUDIO,
        status: MediaStatus.PENDING,
        width: null,
        height: null,
        durationMs: null,
        etag: null,
        uploadedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      storage.createPresignedPutUrl.mockResolvedValue(
        'https://storage.test/voice',
      );

      const result = await service.createUploadIntent('user_1', {
        filename: 'voice.webm',
        mimeType: 'audio/webm;codecs=opus',
        sizeBytes: 32000,
        kind: MediaKind.AUDIO,
      });

      expect(result.media.kind).toBe(MediaKind.AUDIO);
      expect(result.upload.headers['Content-Type']).toBe(
        'audio/webm;codecs=opus',
      );
    });

    it('should reject oversized voice uploads', async () => {
      await expect(
        service.createUploadIntent('user_1', {
          filename: 'voice.m4a',
          mimeType: 'audio/mp4',
          sizeBytes: 26 * 1024 * 1024,
          kind: MediaKind.AUDIO,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeUpload', () => {
    it('should verify object in storage and transition status to READY', async () => {
      const mockMedia = {
        id: 'media_123',
        ownerId: 'user_1',
        objectKey: 'users/user_1/media/2026/08/abc.png',
        originalFilename: 'avatar.png',
        mimeType: 'image/png',
        sizeBytes: BigInt(500000),
        kind: MediaKind.IMAGE,
        status: MediaStatus.PENDING,
        width: null,
        height: null,
        durationMs: null,
        etag: null,
        uploadedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.mediaObject.findUnique.mockResolvedValue(mockMedia);
      storage.headObject.mockResolvedValue({
        contentLength: 500000,
        contentType: 'image/png',
        etag: '"test_etag_123"',
      });

      const updatedMock = {
        ...mockMedia,
        status: MediaStatus.READY,
        uploadedAt: new Date(),
        etag: '"test_etag_123"',
        width: 1080,
        height: 1080,
      };
      prisma.mediaObject.update.mockResolvedValue(updatedMock);

      const result = await service.completeUpload('user_1', 'media_123', {
        width: 1080,
        height: 1080,
      });

      expect(result.status).toBe('READY');
      expect(result.etag).toBe('"test_etag_123"');
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1080);
    });

    it('should fail if user is not the owner', async () => {
      const mockMedia = {
        id: 'media_123',
        ownerId: 'user_other',
        objectKey: 'users/user_other/media/abc.png',
        status: MediaStatus.PENDING,
      };

      prisma.mediaObject.findUnique.mockResolvedValue(mockMedia);

      await expect(
        service.completeUpload('user_attacker', 'media_123', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fail and mark FAILED if object is missing from storage', async () => {
      const mockMedia = {
        id: 'media_123',
        ownerId: 'user_1',
        objectKey: 'users/user_1/media/abc.png',
        status: MediaStatus.PENDING,
      };

      prisma.mediaObject.findUnique.mockResolvedValue(mockMedia);
      storage.headObject.mockResolvedValue(null); // Not in R2

      await expect(
        service.completeUpload('user_1', 'media_123', {}),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.mediaObject.update).toHaveBeenCalledWith({
        where: { id: 'media_123' },
        data: { status: MediaStatus.FAILED },
      });
    });

    it('should return safely and idempotently if already READY', async () => {
      const mockMedia = {
        id: 'media_123',
        ownerId: 'user_1',
        objectKey: 'users/user_1/media/abc.png',
        originalFilename: 'avatar.png',
        mimeType: 'image/png',
        sizeBytes: BigInt(500000),
        kind: MediaKind.IMAGE,
        status: MediaStatus.READY,
        width: 1080,
        height: 1080,
        durationMs: null,
        etag: '"etag"',
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.mediaObject.findUnique.mockResolvedValue(mockMedia);

      const result = await service.completeUpload('user_1', 'media_123', {});
      expect(result.status).toBe('READY');
      expect(storage.headObject).not.toHaveBeenCalled();
    });
  });

  describe('deleteMedia', () => {
    it('should delete from storage and database when authorized owner', async () => {
      const mockMedia = {
        id: 'media_123',
        ownerId: 'user_1',
        objectKey: 'users/user_1/media/abc.png',
      };

      prisma.mediaObject.findUnique.mockResolvedValue(mockMedia);
      storage.deleteObject.mockResolvedValue(undefined);
      prisma.mediaObject.delete.mockResolvedValue(mockMedia);

      const result = await service.deleteMedia('user_1', 'media_123');
      expect(result.message).toContain('deleted');
      expect(storage.deleteObject).toHaveBeenCalledWith(
        'test-bucket',
        'users/user_1/media/abc.png',
      );
      expect(prisma.mediaObject.delete).toHaveBeenCalledWith({
        where: { id: 'media_123' },
      });
    });

    it('should prevent non-owner from deleting media', async () => {
      const mockMedia = {
        id: 'media_123',
        ownerId: 'user_owner',
        objectKey: 'users/user_owner/media/abc.png',
      };

      prisma.mediaObject.findUnique.mockResolvedValue(mockMedia);

      await expect(
        service.deleteMedia('user_attacker', 'media_123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cleanupStaleUploads', () => {
    it('should find stale PENDING media, delete from storage and mark FAILED', async () => {
      const staleItems = [
        { id: 'stale_1', objectKey: 'users/1/media/stale1.png' },
        { id: 'stale_2', objectKey: 'users/2/media/stale2.png' },
      ];

      prisma.mediaObject.findMany.mockResolvedValue(staleItems);
      storage.deleteObject.mockResolvedValue(undefined);
      prisma.mediaObject.update.mockResolvedValue({});

      const result = await service.cleanupStaleUploads(60);

      expect(result.cleanedCount).toBe(2);
      expect(storage.deleteObject).toHaveBeenCalledTimes(2);
      expect(prisma.mediaObject.update).toHaveBeenCalledTimes(2);
    });
  });
});
