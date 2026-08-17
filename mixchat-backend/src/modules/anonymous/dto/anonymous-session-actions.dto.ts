import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';

export enum AnonymousMessageType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  IMAGE = 'IMAGE',
}

export class SendAnonymousMessageDto {
  @ApiPropertyOptional({
    description: 'Text content of the message',
    example: 'Hey there! How is your day going?',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Message type',
    enum: AnonymousMessageType,
    default: AnonymousMessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(AnonymousMessageType)
  type?: AnonymousMessageType = AnonymousMessageType.TEXT;

  @ApiPropertyOptional({
    description: 'Cloudflare R2 MediaObject ID for voice notes or images',
    example: 'med_c1a2b3d4e5f6',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  mediaId?: string;

  @ApiPropertyOptional({
    description: 'Voice note duration in milliseconds',
    example: 4500,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(120000)
  voiceDurationMs?: number;

  @ApiPropertyOptional({
    description: 'Client-generated idempotent message identifier',
    example: 'msg_client_12345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMessageId?: string;
}

export class SkipAnonymousSessionDto {
  @ApiPropertyOptional({
    description: 'Whether to automatically rejoin queue after skipping',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  requeue?: boolean = true;

  @ApiPropertyOptional({
    description: 'Interests to use if requeueing',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  interests?: string[];
}

export class ReportAnonymousSessionDto {
  @ApiProperty({
    description: 'Reason for reporting anonymous partner',
    example: 'Harassment or offensive language',
  })
  @IsString()
  @MaxLength(200)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Additional contextual details for the report',
    example:
      'User repeatedly sent inappropriate messages after being asked to stop.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;

  @ApiPropertyOptional({
    description: 'Message IDs or snippets related to the report',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  messageSnippets?: string[];
}
