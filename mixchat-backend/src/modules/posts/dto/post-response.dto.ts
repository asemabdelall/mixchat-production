import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaKind, PostVisibility } from '@prisma/client';
import { POST_BACKGROUND_THEMES } from '../post-background-theme.constants';

export class PostAuthorDto {
  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'johndoe' })
  username!: string;

  @ApiProperty({ type: String, example: 'John Doe' })
  displayName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://cdn.mixchat.app/avatars/avatar.webp',
  })
  avatarUrl?: string | null;

  @ApiProperty({ type: Boolean, example: false })
  isVerified!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  isPremium!: boolean;
}

export class PostMediaItemDto {
  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    type: String,
    example: 'https://cdn.mixchat.app/users/123/media/image.webp',
  })
  url!: string;

  @ApiProperty({ enum: MediaKind, example: MediaKind.IMAGE })
  kind!: MediaKind;

  @ApiProperty({ type: String, example: 'image/webp' })
  mimeType!: string;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1080 })
  width?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1080 })
  height?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: null })
  durationMs?: number | null;

  @ApiProperty({ type: Number, example: 0 })
  position!: number;
}

export class PostStatsDto {
  @ApiProperty({ type: Number, example: 42 })
  likesCount!: number;

  @ApiProperty({ type: Number, example: 5 })
  commentsCount!: number;

  @ApiProperty({ type: Number, example: 2 })
  repostsCount!: number;
}

export class PostViewerDto {
  @ApiProperty({ type: Boolean, example: true })
  hasLiked!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  hasBookmarked!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  hasReposted!: boolean;
}

export class PostFeedItemDto {
  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({ type: PostAuthorDto })
  author!: PostAuthorDto;

  @ApiProperty({ type: String, example: 'Hello world from MixChat!' })
  content!: string;

  @ApiProperty({ enum: PostVisibility, example: PostVisibility.PUBLIC })
  visibility!: PostVisibility;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'San Francisco, CA',
  })
  locationTag?: string | null;

  @ApiPropertyOptional({
    enum: POST_BACKGROUND_THEMES,
    nullable: true,
    example: 'velvet',
  })
  backgroundTheme?: string | null;

  @ApiProperty({ type: [PostMediaItemDto] })
  media!: PostMediaItemDto[];

  @ApiProperty({ type: PostStatsDto })
  stats!: PostStatsDto;

  @ApiProperty({ type: PostViewerDto })
  viewer!: PostViewerDto;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '2026-08-14T21:00:00.000Z',
  })
  editedAt?: string | null;

  @ApiProperty({ type: String, example: '2026-08-14T20:00:00.000Z' })
  createdAt!: string;
}

export class PageInfoDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTE0VDIwOjAwOjAwLjAwMFoiLCJpZCI6IjEyMyJ9',
  })
  nextCursor?: string | null;

  @ApiProperty({ type: Boolean, example: true })
  hasNextPage!: boolean;
}

export class PaginatedFeedResponseDto {
  @ApiProperty({ type: [PostFeedItemDto] })
  items!: PostFeedItemDto[];

  @ApiProperty({ type: PageInfoDto })
  pageInfo!: PageInfoDto;
}

export class LikeResponseDto {
  @ApiProperty({ example: true })
  hasLiked!: boolean;

  @ApiProperty({ example: 43 })
  likesCount!: number;
}

export class BookmarkResponseDto {
  @ApiProperty({ example: true })
  hasBookmarked!: boolean;
}

export class RepostResponseDto {
  @ApiProperty({ example: true })
  hasReposted!: boolean;

  @ApiProperty({ example: 3 })
  repostsCount!: number;
}
