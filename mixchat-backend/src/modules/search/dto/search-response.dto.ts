import { ApiProperty } from '@nestjs/swagger';
import {
  PageInfoDto,
  PostFeedItemDto,
} from '../../posts/dto/post-response.dto';
import { PublicProfileDto } from '../../users/dto/user-profile.dto';
import { TrendingTagDto } from './trending-response.dto';

export class SearchMediaItemDto {
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

  @ApiProperty({ type: String, example: 'image/webp' })
  mimeType!: string;

  @ApiProperty({ type: String, example: 'IMAGE' })
  kind!: string;

  @ApiProperty({ type: String, example: 'post-123' })
  postId!: string;

  @ApiProperty({ type: Number, example: 42 })
  likesCount!: number;

  @ApiProperty({ type: Number, example: 7 })
  commentsCount!: number;
}

export class UniversalSearchResponseDto {
  @ApiProperty({ type: String, example: 'cyberpunk' })
  query!: string;

  @ApiProperty({ type: String, example: 'all' })
  type!: string;

  @ApiProperty({ type: [PublicProfileDto] })
  users!: PublicProfileDto[];

  @ApiProperty({ type: [PostFeedItemDto] })
  posts!: PostFeedItemDto[];

  @ApiProperty({ type: [TrendingTagDto] })
  tags!: TrendingTagDto[];

  @ApiProperty({ type: [SearchMediaItemDto] })
  media!: SearchMediaItemDto[];

  @ApiProperty({ type: PageInfoDto })
  pageInfo!: PageInfoDto;
}

export class ExploreFeedResponseDto {
  @ApiProperty({ type: [PostFeedItemDto] })
  items!: PostFeedItemDto[];

  @ApiProperty({ type: PageInfoDto })
  pageInfo!: PageInfoDto;
}
