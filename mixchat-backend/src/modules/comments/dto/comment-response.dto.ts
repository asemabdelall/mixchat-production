import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommentStatus } from '@prisma/client';
import { PageInfoDto } from '../../posts/dto/post-response.dto';

export class CommentAuthorDto {
  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'alex_smith' })
  username!: string;

  @ApiProperty({ type: String, example: 'Alex Smith' })
  displayName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://cdn.mixchat.app/avatars/alex.webp',
  })
  avatarUrl?: string | null;

  @ApiProperty({ type: Boolean, example: false })
  isVerified!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  isPremium!: boolean;
}

export class CommentMentionDto {
  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId!: string;

  @ApiProperty({ type: String, example: 'alex_smith' })
  username!: string;
}

export class CommentStatsDto {
  @ApiProperty({ type: Number, example: 3 })
  repliesCount!: number;

  @ApiProperty({ type: Number, example: 12 })
  likesCount!: number;
}

export class CommentViewerDto {
  @ApiProperty({ type: Boolean, example: false })
  hasLiked!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  canEdit!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  canDelete!: boolean;
}

export class CommentDto {
  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  postId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'd3b07384-d113-40e1-a64d-9a9ecf4a66a1',
  })
  reelId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  parentId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  rootId?: string | null;

  @ApiPropertyOptional({ type: CommentAuthorDto, nullable: true })
  author?: CommentAuthorDto | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Awesome capture! @alex',
  })
  content?: string | null;

  @ApiProperty({ enum: CommentStatus, example: CommentStatus.PUBLISHED })
  status!: CommentStatus;

  @ApiProperty({ type: Boolean, example: false })
  isDeleted!: boolean;

  @ApiProperty({ type: [CommentMentionDto] })
  mentions!: CommentMentionDto[];

  @ApiProperty({ type: CommentStatsDto })
  stats!: CommentStatsDto;

  @ApiProperty({ type: CommentViewerDto })
  viewer!: CommentViewerDto;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  editedAt?: string | null;

  @ApiProperty({ type: String, example: '2026-08-14T21:00:00.000Z' })
  createdAt!: string;
}

export class PaginatedCommentsResponseDto {
  @ApiProperty({ type: [CommentDto] })
  items!: CommentDto[];

  @ApiProperty({ type: PageInfoDto })
  pageInfo!: PageInfoDto;
}

export class CommentLikeResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  hasLiked!: boolean;

  @ApiProperty({ type: Number, example: 13 })
  likesCount!: number;
}
