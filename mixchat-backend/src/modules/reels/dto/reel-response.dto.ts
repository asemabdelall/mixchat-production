import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostVisibility, PostStatus } from '@prisma/client';

export class ReelAuthorDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ example: 'sarah_creator' })
  username!: string;

  @ApiProperty({ example: 'Sarah Jenkins' })
  displayName!: string;

  @ApiPropertyOptional({
    type: String,
    example: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    nullable: true,
  })
  avatarUrl?: string | null;

  @ApiProperty({ example: true })
  isVerified!: boolean;

  @ApiProperty({ example: false })
  isPremium!: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether the current viewer is following this author',
    example: false,
  })
  isFollowing?: boolean;
}

export class ReelVideoDto {
  @ApiProperty({ example: 'd3b07384-d113-40e1-a64d-9a9ecf4a66a1' })
  mediaObjectId!: string;

  @ApiProperty({
    description: 'Public or presigned delivery URL for progressive playback',
    example: 'https://r2.mixchat.com/videos/reel_123.mp4',
  })
  url!: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Video poster / thumbnail image URL',
    example: 'https://r2.mixchat.com/thumbnails/reel_123.jpg',
    nullable: true,
  })
  posterUrl?: string | null;

  @ApiProperty({ example: 'video/mp4' })
  mimeType!: string;

  @ApiPropertyOptional({ type: Number, example: 1080, nullable: true })
  width?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1920, nullable: true })
  height?: number | null;

  @ApiPropertyOptional({ type: Number, example: 15400, nullable: true })
  durationMs?: number | null;
}

export class ReelCountsDto {
  @ApiProperty({ example: 245 })
  likesCount!: number;

  @ApiProperty({ example: 18 })
  commentsCount!: number;

  @ApiProperty({ example: 12 })
  bookmarksCount!: number;

  @ApiProperty({
    description: 'Real qualified views count',
    example: 1540,
  })
  viewsCount!: number;

  @ApiProperty({ example: 4 })
  sharesCount!: number;
}

export class ReelViewerStateDto {
  @ApiProperty({ example: false })
  hasLiked!: boolean;

  @ApiProperty({ example: false })
  hasBookmarked!: boolean;
}

export class ReelItemDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id!: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  authorId!: string;

  @ApiProperty({ type: ReelAuthorDto })
  author!: ReelAuthorDto;

  @ApiProperty({ type: ReelVideoDto })
  video!: ReelVideoDto;

  @ApiPropertyOptional({
    type: String,
    example:
      'Mesmerizing northern lights captured last night! 🌌 #aurora #travel',
    nullable: true,
  })
  caption?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Original Audio - MixChat Sounds',
    nullable: true,
  })
  audioTitle?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Tromsø, Norway',
    nullable: true,
  })
  locationTag?: string | null;

  @ApiProperty({ enum: PostVisibility, example: PostVisibility.PUBLIC })
  visibility!: PostVisibility;

  @ApiProperty({ enum: PostStatus, example: PostStatus.PUBLISHED })
  status!: PostStatus;

  @ApiProperty({ type: ReelCountsDto })
  counts!: ReelCountsDto;

  @ApiProperty({ type: ReelViewerStateDto })
  viewerState!: ReelViewerStateDto;

  @ApiProperty({ example: '2026-08-14T20:00:00.000Z' })
  createdAt!: string;
}

export class PaginatedReelsResponseDto {
  @ApiProperty({ type: [ReelItemDto] })
  items!: ReelItemDto[];

  @ApiPropertyOptional({
    type: String,
    description: 'Opaque cursor string for requesting the next page',
    nullable: true,
  })
  nextCursor?: string | null;

  @ApiProperty({ example: true })
  hasMore!: boolean;
}

export class ReelLikeResponseDto {
  @ApiProperty({ example: true })
  liked!: boolean;

  @ApiProperty({ example: 246 })
  likesCount!: number;
}

export class ReelBookmarkResponseDto {
  @ApiProperty({ example: true })
  bookmarked!: boolean;

  @ApiProperty({ example: 13 })
  bookmarksCount!: number;
}
