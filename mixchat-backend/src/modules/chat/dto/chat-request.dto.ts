import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType, MessageType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ enum: ConversationType })
  @IsEnum(ConversationType)
  type!: ConversationType;

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf(
    (value: CreateConversationDto) => value.type === ConversationType.DIRECT,
  )
  @IsUUID()
  targetUserId?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @ValidateIf(
    (value: CreateConversationDto) => value.type === ConversationType.GROUP,
  )
  @IsString()
  @Length(1, 100)
  title?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 99 })
  @ValidateIf(
    (value: CreateConversationDto) => value.type === ConversationType.GROUP,
  )
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(99)
  @IsUUID(undefined, { each: true })
  memberIds?: string[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  avatarMediaObjectId?: string;
}

export class ChatPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 30;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  archived = false;
}

export class SendMessageDto {
  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType)
  type!: MessageType;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @Length(1, 4000)
  text?: string;

  @ApiProperty({ minLength: 8, maxLength: 100 })
  @IsString()
  @Length(8, 100)
  clientMessageId!: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(10)
  @IsUUID(undefined, { each: true })
  mediaObjectIds?: string[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 600000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600000)
  durationMs?: number;

  @ApiPropertyOptional({ type: [Number], maxItems: 64 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((v: unknown) =>
          Math.min(100, Math.max(0, Math.round(Number(v) || 0))),
        )
      : value,
  )
  @IsArray()
  @ArrayMaxSize(64)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(100, { each: true })
  waveform?: number[];
}

export class MarkConversationReadDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  lastReadMessageId!: string;
}

export class UpdateConversationStateDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'ISO date; null unmutes',
  })
  @IsOptional()
  @IsString()
  mutedUntil?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

export class UpdateMessageDto {
  @ApiProperty({ minLength: 1, maxLength: 4000 })
  @IsString()
  @Length(1, 4000)
  text!: string;
}

export class UpdateGroupDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  title?: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  avatarMediaObjectId?: string | null;
}

export class GroupMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}
