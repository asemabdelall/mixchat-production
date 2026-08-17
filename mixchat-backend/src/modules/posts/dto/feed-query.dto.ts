import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class FeedQueryDto {
  @ApiPropertyOptional({
    description: 'Opaque pagination cursor from previous pageInfo.nextCursor',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of posts to fetch (default: 20, max: 50)',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Feed tab filter: for_you (default), following, trending',
    default: 'for_you',
    enum: ['for_you', 'following', 'trending'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['for_you', 'following', 'trending'])
  tab?: 'for_you' | 'following' | 'trending' = 'for_you';
}

export class UserPostsQueryDto {
  @ApiPropertyOptional({
    description: 'Opaque pagination cursor',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of posts to fetch (default: 20, max: 50)',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
