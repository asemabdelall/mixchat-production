export interface PresignedPutOptions {
  bucket: string;
  key: string;
  contentType: string;
  expiresInSeconds: number;
}

export interface PresignedGetOptions {
  bucket: string;
  key: string;
  expiresInSeconds: number;
}

export interface ObjectMetadata {
  contentLength?: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
}

export abstract class ObjectStorage {
  /**
   * Generates a short-lived presigned URL for direct client PUT upload
   */
  abstract createPresignedPutUrl(options: PresignedPutOptions): Promise<string>;

  /**
   * Generates a presigned URL for GET / download
   */
  abstract createPresignedGetUrl(options: PresignedGetOptions): Promise<string>;

  /**
   * Retrieves object metadata (HeadObject) to verify upload status and size
   */
  abstract headObject(
    bucket: string,
    key: string,
  ): Promise<ObjectMetadata | null>;

  /**
   * Deletes an object from storage
   */
  abstract deleteObject(bucket: string, key: string): Promise<void>;

  /**
   * Checks if an object exists in storage
   */
  abstract objectExists(bucket: string, key: string): Promise<boolean>;
}
