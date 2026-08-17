import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ObjectStorage } from '../../infrastructure/storage/object-storage.abstract';
import {
  CreateUploadIntentDto,
  UploadIntentResponseDto,
  MediaObjectDto,
} from './dto/upload-intent.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { MediaKind, MediaStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as path from 'path';

const ALLOWED_MIME_TYPES: Record<MediaKind, string[]> = {
  IMAGE: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
  ],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'],
  AUDIO: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/x-m4a',
    'audio/m4a',
    'audio/aac',
    'audio/3gpp',
    'audio/3gpp2',
  ],
  FILE: [
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ],
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;
  private readonly ttlSeconds: number;
  private readonly maxImageBytes: number;
  private readonly maxVideoBytes: number;
  private readonly maxAudioBytes = 25 * 1024 * 1024;
  private readonly maxFileBytes = 25 * 1024 * 1024;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
    private readonly configService: ConfigService,
  ) {
    this.bucket =
      this.configService.get<string>('storage.bucket') || 'mixchat-media';
    this.publicBaseUrl = this.configService.get<string>(
      'storage.publicBaseUrl',
    );
    this.ttlSeconds =
      this.configService.get<number>('media.uploadUrlTtlSeconds') || 900;
    this.maxImageBytes =
      this.configService.get<number>('media.maxImageBytes') || 10485760; // 10MB
    this.maxVideoBytes =
      this.configService.get<number>('media.maxVideoBytes') || 104857600; // 100MB
  }

  /**
   * Generates a safe collision-resistant R2 object key
   */
  private generateObjectKey(userId: string, originalFilename: string): string {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const safeExt = path.extname(originalFilename).toLowerCase() || '';
    const uniqueId = randomUUID();

    return `users/${userId}/media/${year}/${month}/${uniqueId}${safeExt}`;
  }

  /**
   * Maps Prisma MediaObject to strongly-typed API DTO with derived public URL
   */
  public async toDto(media: {
    id: string;
    objectKey: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: bigint | number;
    kind: MediaKind;
    status: MediaStatus;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    etag: string | null;
    uploadedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<MediaObjectDto> {
    let publicUrl: string | null = null;

    if (this.publicBaseUrl) {
      publicUrl = `${this.publicBaseUrl.replace(/\/$/, '')}/${media.objectKey}`;
    } else if (media.status === MediaStatus.READY) {
      // If no custom domain / public CDN is set, generate a signed GET URL (valid for 24 hours)
      try {
        publicUrl = await this.storage.createPresignedGetUrl({
          bucket: this.bucket,
          key: media.objectKey,
          expiresInSeconds: 86400, // 24 hours
        });
      } catch {
        publicUrl = null;
      }
    }

    return {
      id: media.id,
      objectKey: media.objectKey,
      originalFilename: media.originalFilename,
      mimeType: media.mimeType,
      sizeBytes: Number(media.sizeBytes),
      kind: media.kind,
      status: media.status,
      publicUrl,
      width: media.width,
      height: media.height,
      durationMs: media.durationMs,
      etag: media.etag,
      uploadedAt: media.uploadedAt ? media.uploadedAt.toISOString() : null,
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
    };
  }

  /**
   * Request upload intent, allocate safe key, create PENDING record and sign PUT URL
   */
  async createUploadIntent(
    userId: string,
    dto: CreateUploadIntentDto,
  ): Promise<UploadIntentResponseDto> {
    const allowedMimes = ALLOWED_MIME_TYPES[dto.kind] || [];
    const normalizedMime = dto.mimeType.toLowerCase();
    const baseMime = normalizedMime.split(';', 1)[0].trim();

    if (!allowedMimes.includes(baseMime)) {
      throw new BadRequestException({
        code: 'MEDIA_INVALID_TYPE',
        message: `MIME type ${dto.mimeType} is not permitted for kind ${dto.kind}`,
      });
    }

    if (dto.kind === MediaKind.IMAGE && dto.sizeBytes > this.maxImageBytes) {
      throw new BadRequestException({
        code: 'MEDIA_TOO_LARGE',
        message: `Image size exceeds maximum allowed of ${this.maxImageBytes} bytes`,
      });
    }

    if (dto.kind === MediaKind.VIDEO && dto.sizeBytes > this.maxVideoBytes) {
      throw new BadRequestException({
        code: 'MEDIA_TOO_LARGE',
        message: `Video size exceeds maximum allowed of ${this.maxVideoBytes} bytes`,
      });
    }

    if (dto.kind === MediaKind.AUDIO && dto.sizeBytes > this.maxAudioBytes) {
      throw new BadRequestException({
        code: 'MEDIA_TOO_LARGE',
        message: `Audio size exceeds maximum allowed of ${this.maxAudioBytes} bytes`,
      });
    }

    if (dto.kind === MediaKind.FILE && dto.sizeBytes > this.maxFileBytes) {
      throw new BadRequestException({
        code: 'MEDIA_TOO_LARGE',
        message: `File size exceeds maximum allowed of ${this.maxFileBytes} bytes`,
      });
    }

    const objectKey = this.generateObjectKey(userId, dto.filename);

    const media = await this.prisma.mediaObject.create({
      data: {
        ownerId: userId,
        objectKey,
        originalFilename: path.basename(dto.filename),
        mimeType: normalizedMime,
        sizeBytes: BigInt(dto.sizeBytes),
        kind: dto.kind,
        status: MediaStatus.PENDING,
      },
    });

    const presignedUrl = await this.storage.createPresignedPutUrl({
      bucket: this.bucket,
      key: objectKey,
      contentType: normalizedMime,
      expiresInSeconds: this.ttlSeconds,
    });

    const expiresAt = new Date(
      Date.now() + this.ttlSeconds * 1000,
    ).toISOString();

    this.logger.log(
      `Created upload intent: mediaId=${media.id} ownerId=${userId} objectKey=${objectKey}`,
    );

    return {
      media: await this.toDto(media),
      upload: {
        url: presignedUrl,
        method: 'PUT',
        headers: {
          'Content-Type': normalizedMime,
        },
        expiresAt,
      },
    };
  }

  /**
   * Finalize upload by verifying presence in R2 via HeadObject and transitioning to READY
   */
  async completeUpload(
    userId: string,
    mediaId: string,
    dto: CompleteUploadDto,
  ): Promise<MediaObjectDto> {
    const media = await this.prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Media object does not exist',
      });
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException({
        code: 'MEDIA_NOT_OWNER',
        message: 'You are not authorized to finalize this media upload',
      });
    }

    // Idempotent completion if already ready
    if (media.status === MediaStatus.READY) {
      return await this.toDto(media);
    }

    if (
      media.status === MediaStatus.DELETED ||
      media.status === MediaStatus.FAILED
    ) {
      throw new BadRequestException({
        code: 'MEDIA_INVALID_STATE',
        message: `Media object cannot be finalized from state ${media.status}`,
      });
    }

    // Verify object existence in R2
    const objectMeta = await this.storage.headObject(
      this.bucket,
      media.objectKey,
    );

    if (!objectMeta) {
      await this.prisma.mediaObject.update({
        where: { id: mediaId },
        data: { status: MediaStatus.FAILED },
      });

      this.logger.warn(
        `Failed upload verification: object not found in R2 for mediaId=${mediaId}`,
      );

      throw new BadRequestException({
        code: 'MEDIA_OBJECT_NOT_IN_STORAGE',
        message: 'Direct storage upload could not be verified in Cloudflare R2',
      });
    }

    const updated = await this.prisma.mediaObject.update({
      where: { id: mediaId },
      data: {
        status: MediaStatus.READY,
        sizeBytes: objectMeta.contentLength
          ? BigInt(objectMeta.contentLength)
          : media.sizeBytes,
        etag: objectMeta.etag || null,
        width: dto.width ?? null,
        height: dto.height ?? null,
        durationMs: dto.durationMs ?? null,
        uploadedAt: objectMeta.lastModified || new Date(),
      },
    });

    this.logger.log(
      `Finalized upload: mediaId=${mediaId} objectKey=${media.objectKey}`,
    );

    return await this.toDto(updated);
  }

  /**
   * Get media object metadata by ID
   */
  async getMedia(userId: string, mediaId: string): Promise<MediaObjectDto> {
    const media = await this.prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.status === MediaStatus.DELETED) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Media object does not exist',
      });
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException({
        code: 'MEDIA_NOT_OWNER',
        message: 'You are not authorized to view this media object',
      });
    }

    return await this.toDto(media);
  }

  /**
   * Delete media object from R2 storage and mark as DELETED in PostgreSQL
   */
  async deleteMedia(
    userId: string,
    mediaId: string,
  ): Promise<{ message: string }> {
    const media = await this.prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Media object does not exist',
      });
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException({
        code: 'MEDIA_NOT_OWNER',
        message: 'You are not authorized to delete this media object',
      });
    }

    // Delete object from R2 storage
    await this.storage.deleteObject(this.bucket, media.objectKey);

    // Delete from DB or transition status
    await this.prisma.mediaObject.delete({
      where: { id: mediaId },
    });

    this.logger.log(
      `Deleted media object: mediaId=${mediaId} ownerId=${userId}`,
    );

    return { message: 'Media object deleted successfully' };
  }

  /**
   * Cleanup stale PENDING uploads older than threshold
   */
  async cleanupStaleUploads(
    staleThresholdMinutes = 60,
  ): Promise<{ cleanedCount: number }> {
    const cutoffDate = new Date(Date.now() - staleThresholdMinutes * 60 * 1000);

    const staleUploads = await this.prisma.mediaObject.findMany({
      where: {
        status: MediaStatus.PENDING,
        createdAt: { lt: cutoffDate },
      },
      take: 100,
    });

    let cleanedCount = 0;

    for (const item of staleUploads) {
      try {
        await this.storage.deleteObject(this.bucket, item.objectKey);
        await this.prisma.mediaObject.update({
          where: { id: item.id },
          data: { status: MediaStatus.FAILED },
        });
        cleanedCount++;
      } catch (err: unknown) {
        this.logger.error(
          `Failed cleaning stale mediaId=${item.id}: ${(err as Error)?.message}`,
        );
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned ${cleanedCount} stale pending media uploads`);
    }

    return { cleanedCount };
  }
}
