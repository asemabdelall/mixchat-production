import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { PostVisibility } from '@prisma/client';

export class UpdatePostDto {
  @ApiPropertyOptional({
    description: 'Updated post text content (max 2000 chars)',
    example: 'Updated post content...',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Post content cannot exceed 2000 characters' })
  content?: string;

  @ApiPropertyOptional({
    enum: PostVisibility,
    description: 'Updated visibility level',
  })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({
    description: 'Optional location tag',
    example: 'New York, NY',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationTag?: string;
}
