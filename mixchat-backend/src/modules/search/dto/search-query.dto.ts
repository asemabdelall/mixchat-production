import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchType {
  ALL = 'all',
  USERS = 'users',
  POSTS = 'posts',
  TAGS = 'tags',
  MEDIA = 'media',
}

export class UniversalSearchQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Search text query (username, name, keyword, or hashtag)',
    example: 'alex',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    enum: SearchType,
    default: SearchType.ALL,
    description: 'Search domain category',
    example: SearchType.ALL,
  })
  @IsEnum(SearchType)
  @IsOptional()
  type: SearchType = SearchType.ALL;

  @ApiPropertyOptional({
    type: String,
    description: 'Opaque pagination cursor',
  })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 50,
    default: 20,
    description: 'Number of items to retrieve',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit: number = 20;
}

export class ExploreQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Opaque pagination cursor',
  })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 50,
    default: 20,
    description: 'Number of items to retrieve',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit: number = 20;
}
