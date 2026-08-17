import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';
import { PostVisibility } from '@prisma/client';

export class CreatePostDto {
  @ApiPropertyOptional({
    description: 'Post text content (max 2000 chars)',
    example: 'Excited to share our new launch today! #tech #startup',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Post content cannot exceed 2000 characters' })
  content?: string;

  @ApiPropertyOptional({
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
    description: 'Visibility level of the post',
  })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({
    description: 'Optional location tag (e.g. city or venue)',
    example: 'San Francisco, CA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationTag?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Ordered array of MediaObject IDs attached to this post (max 10)',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, {
    message: 'A post cannot contain more than 10 media items',
  })
  @IsUUID('4', { each: true, message: 'Each media ID must be a valid UUIDv4' })
  mediaObjectIds?: string[];
}
