import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class NotificationActorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl?: string | null;

  @ApiProperty()
  isVerified!: boolean;
}

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty()
  entityId!: string;

  @ApiProperty()
  entityType!: string;

  @ApiPropertyOptional({ type: NotificationActorDto, nullable: true })
  actor?: NotificationActorDto | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Safe internal route URL for navigation',
  })
  targetUrl?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  readAt!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  metadata!: Record<string, any> | null;

  @ApiProperty()
  createdAt!: string;
}

export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];

  @ApiPropertyOptional({ type: String, nullable: true })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty()
  unreadCount!: number;
}

export class UnreadCountResponseDto {
  @ApiProperty()
  unreadCount!: number;
}

export enum NotificationFilter {
  ALL = 'ALL',
  SOCIAL = 'SOCIAL',
  LIKES = 'LIKES',
  COMMENTS = 'COMMENTS',
  MENTIONS = 'MENTIONS',
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: NotificationFilter,
    default: NotificationFilter.ALL,
  })
  @IsOptional()
  @IsEnum(NotificationFilter)
  filter?: NotificationFilter = NotificationFilter.ALL;
}
