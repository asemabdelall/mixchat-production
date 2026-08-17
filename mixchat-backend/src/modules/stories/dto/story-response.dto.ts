import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MediaKind,
  StoryAudience,
  StoryReactionType,
  StoryStatus,
} from '@prisma/client';

export class StoryMediaDto {
  @ApiProperty({
    type: String,
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;

  @ApiProperty({
    type: String,
    example: 'https://cdn.mixchat.app/stories/photo.webp',
  })
  url!: string;

  @ApiProperty({ enum: MediaKind, example: MediaKind.IMAGE })
  kind!: MediaKind;

  @ApiProperty({ type: String, example: 'image/webp' })
  mimeType!: string;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1080 })
  width?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1920 })
  height?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 5000 })
  durationMs?: number | null;
}

export class StoryAuthorDto {
  @ApiProperty({
    type: String,
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'alex' })
  username!: string;

  @ApiProperty({ type: String, example: 'Alex Morgan' })
  displayName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://cdn.mixchat.app/avatars/alex.webp',
  })
  avatarUrl?: string | null;

  @ApiProperty({ type: Boolean, example: true })
  isVerified!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  isPremium!: boolean;
}

export class StoryViewerStateDto {
  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'True if current viewer has seen this story',
  })
  hasViewed!: boolean;

  @ApiPropertyOptional({
    enum: StoryReactionType,
    nullable: true,
    example: StoryReactionType.HEART,
    description: 'Viewer current reaction if any',
  })
  reaction?: StoryReactionType | null;
}

export class StoryItemDto {
  @ApiProperty({
    type: String,
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Tokyo Night Drive 🌃',
  })
  caption?: string | null;

  @ApiProperty({ enum: StoryAudience, example: StoryAudience.PUBLIC })
  audience!: StoryAudience;

  @ApiProperty({ enum: StoryStatus, example: StoryStatus.ACTIVE })
  status!: StoryStatus;

  @ApiPropertyOptional({
    type: Number,
    example: 142,
    description:
      'Unique viewers count (visible only to story author or archive)',
  })
  viewsCount?: number;

  @ApiProperty({ type: String, example: '2026-08-14T20:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ type: String, example: '2026-08-15T20:00:00.000Z' })
  expiresAt!: string;

  @ApiProperty({ type: () => StoryMediaDto })
  media!: StoryMediaDto;

  @ApiProperty({ type: () => StoryAuthorDto })
  author!: StoryAuthorDto;

  @ApiProperty({ type: () => StoryViewerStateDto })
  viewer!: StoryViewerStateDto;
}

export class StoryGroupDto {
  @ApiProperty({ type: () => StoryAuthorDto })
  author!: StoryAuthorDto;

  @ApiProperty({ type: () => [StoryItemDto] })
  stories!: StoryItemDto[];

  @ApiProperty({
    type: Boolean,
    example: true,
    description:
      'True if there are stories in this group that the viewer has not seen',
  })
  hasUnseen!: boolean;

  @ApiProperty({ type: String, example: '2026-08-14T20:00:00.000Z' })
  latestStoryAt!: string;
}

export class ActiveStoriesResponseDto {
  @ApiProperty({ type: () => [StoryGroupDto] })
  groups!: StoryGroupDto[];
}

export class StoryPageInfoDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTE0VDIwOjAwOjAwWiJ9',
  })
  nextCursor?: string | null;

  @ApiProperty({ type: Boolean, example: true })
  hasNextPage!: boolean;
}

export class StoryArchiveResponseDto {
  @ApiProperty({ type: () => [StoryItemDto] })
  items!: StoryItemDto[];

  @ApiProperty({ type: () => StoryPageInfoDto })
  pageInfo!: StoryPageInfoDto;
}

export class StoryViewerItemDto {
  @ApiProperty({
    type: String,
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'sarah' })
  username!: string;

  @ApiProperty({ type: String, example: 'Sarah Connor' })
  displayName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://cdn.mixchat.app/avatars/sarah.webp',
  })
  avatarUrl?: string | null;

  @ApiProperty({ type: Boolean, example: true })
  isVerified!: boolean;

  @ApiProperty({ type: String, example: '2026-08-14T20:05:00.000Z' })
  viewedAt!: string;

  @ApiPropertyOptional({
    enum: StoryReactionType,
    nullable: true,
    example: StoryReactionType.HEART,
  })
  reaction?: StoryReactionType | null;
}

export class StoryViewersResponseDto {
  @ApiProperty({ type: () => [StoryViewerItemDto] })
  items!: StoryViewerItemDto[];

  @ApiProperty({ type: Number, example: 142 })
  totalCount!: number;

  @ApiProperty({ type: () => StoryPageInfoDto })
  pageInfo!: StoryPageInfoDto;
}

export class StoryReplyItemDto {
  @ApiProperty({
    type: String,
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id!: string;

  @ApiProperty({
    type: String,
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  storyId!: string;

  @ApiProperty({ type: () => StoryAuthorDto })
  sender!: StoryAuthorDto;

  @ApiProperty({ type: String, example: 'Awesome picture! 🌅' })
  content!: string;

  @ApiProperty({ type: String, example: '2026-08-14T20:05:00.000Z' })
  createdAt!: string;
}

export class StoryRepliesResponseDto {
  @ApiProperty({ type: () => [StoryReplyItemDto] })
  items!: StoryReplyItemDto[];

  @ApiProperty({ type: () => StoryPageInfoDto })
  pageInfo!: StoryPageInfoDto;
}
