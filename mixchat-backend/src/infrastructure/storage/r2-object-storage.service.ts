import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  ObjectStorage,
  PresignedPutOptions,
  PresignedGetOptions,
  ObjectMetadata,
} from './object-storage.abstract';

@Injectable()
export class R2ObjectStorage extends ObjectStorage {
  private readonly logger = new Logger(R2ObjectStorage.name);
  private readonly s3Client: S3Client;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    super();

    const accountId = this.configService.get<string>('storage.accountId');
    const accessKeyId = this.configService.get<string>('storage.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'storage.secretAccessKey',
    );
    const customEndpoint = this.configService.get<string>('storage.endpoint');

    const endpoint =
      customEndpoint ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    if (accessKeyId && secretAccessKey && endpoint) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.isConfigured = true;
      this.logger.log('Cloudflare R2 ObjectStorage client initialized');
    } else {
      // In development / test without credentials, initialize with fake dummy credentials
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint:
          endpoint || 'https://fake-account-id.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: accessKeyId || 'dev_mock_access_key',
          secretAccessKey: secretAccessKey || 'dev_mock_secret_key',
        },
      });
      this.isConfigured = false;
      this.logger.warn(
        'Cloudflare R2 credentials not fully configured in environment. Using fallback mode for local testing.',
      );
    }
  }

  public getClient(): S3Client {
    return this.s3Client;
  }

  public isStorageConfigured(): boolean {
    return this.isConfigured;
  }

  async createPresignedPutUrl(options: PresignedPutOptions): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
      ContentType: options.contentType,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: options.expiresInSeconds,
    });
  }

  async createPresignedGetUrl(options: PresignedGetOptions): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: options.expiresInSeconds,
    });
  }

  async headObject(
    bucket: string,
    key: string,
  ): Promise<ObjectMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        etag: response.ETag,
        lastModified: response.LastModified,
      };
    } catch (err: unknown) {
      const errorName = (err as { name?: string })?.name;
      const httpStatus = (err as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;

      if (errorName === 'NotFound' || httpStatus === 404) {
        return null;
      }

      this.logger.error(
        `Failed to head object: ${key} in bucket: ${bucket}`,
        (err as Error)?.stack,
      );
      throw err;
    }
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (err: unknown) {
      const errorName = (err as { name?: string })?.name;
      const httpStatus = (err as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;

      if (errorName === 'NotFound' || httpStatus === 404) {
        return; // Idempotent delete
      }

      this.logger.error(
        `Failed to delete object: ${key} in bucket: ${bucket}`,
        (err as Error)?.stack,
      );
      throw err;
    }
  }

  async objectExists(bucket: string, key: string): Promise<boolean> {
    const meta = await this.headObject(bucket, key);
    return meta !== null;
  }
}
