import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MediaKind } from '@prisma/client';

export class CreateUploadIntentDto {
  @ApiProperty({
    type: String,
    example: 'avatar.png',
    description: 'Original name of the file being uploaded',
  })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({
    type: String,
    example: 'audio/webm',
    description: 'MIME type of the file',
  })
  @IsString()
  @Matches(
    /^(image\/(jpeg|jpg|png|webp|avif|gif)|video\/(mp4|webm|quicktime|x-matroska)|audio\/(mpeg|mp3|wav|ogg|webm|mp4|x-m4a|m4a|aac|3gpp|3gpp2)|application\/(pdf|zip|x-zip-compressed|octet-stream)|text\/plain)(;.*)?$/,
    {
      message:
        'mimeType must be a valid supported audio, video, image, or document MIME type',
    },
  )
  mimeType!: string;

  @ApiProperty({
    type: Number,
    example: 1048576,
    description: 'File size in bytes',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(104857600) // 100MB maximum
  sizeBytes!: number;

  @ApiProperty({
    enum: ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'],
    example: 'IMAGE',
    description: 'Kind of media being uploaded',
  })
  @IsEnum(MediaKind)
  kind!: MediaKind;
}

export class UploadContractDto {
  @ApiProperty({
    type: String,
    example: 'https://xxx.r2.cloudflarestorage.com/mixchat-media/users/...',
  })
  url!: string;

  @ApiProperty({ type: String, example: 'PUT' })
  method!: string;

  @ApiProperty({
    type: Object,
    example: { 'Content-Type': 'image/png' },
  })
  headers!: Record<string, string>;

  @ApiProperty({ type: String, example: '2026-08-14T21:30:00.000Z' })
  expiresAt!: string;
}

export class MediaObjectDto {
  @ApiProperty({
    type: String,
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'users/123/media/2026/08/abc.png' })
  objectKey!: string;

  @ApiProperty({ type: String, example: 'avatar.png' })
  originalFilename!: string;

  @ApiProperty({ type: String, example: 'image/png' })
  mimeType!: string;

  @ApiProperty({ type: Number, example: 1048576 })
  sizeBytes!: number;

  @ApiProperty({ enum: ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'], example: 'IMAGE' })
  kind!: MediaKind;

  @ApiProperty({
    enum: ['PENDING', 'READY', 'FAILED', 'DELETED'],
    example: 'PENDING',
  })
  status!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://media.mixchat.app/users/123/media/abc.png',
  })
  publicUrl?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1080 })
  width?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1080 })
  height?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 15000 })
  durationMs?: number | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '"d41d8cd98f00b204e9800998ecf8427e"',
  })
  etag?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '2026-08-14T21:00:00.000Z',
  })
  uploadedAt?: string | null;

  @ApiProperty({ type: String, example: '2026-08-14T21:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ type: String, example: '2026-08-14T21:00:00.000Z' })
  updatedAt!: string;
}

export class UploadIntentResponseDto {
  @ApiProperty({ type: MediaObjectDto })
  media!: MediaObjectDto;

  @ApiProperty({ type: UploadContractDto })
  upload!: UploadContractDto;
}
