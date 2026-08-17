import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { StoryAudience } from '@prisma/client';

export class CreateStoryDto {
  @ApiProperty({
    description:
      'ID of an uploaded READY MediaObject belonging to the current user',
    example: 'd3b07384-d113-424a-9b55-6b3a39e9e1c2',
  })
  @IsString()
  @IsNotEmpty()
  mediaObjectId: string;

  @ApiPropertyOptional({
    description: 'Optional textual caption for the story (max 500 characters)',
    example: 'Enjoying the golden sunset in Tokyo! 🌇',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @ApiPropertyOptional({
    description: 'Story audience visibility setting',
    enum: StoryAudience,
    default: StoryAudience.PUBLIC,
    example: StoryAudience.PUBLIC,
  })
  @IsOptional()
  @IsEnum(StoryAudience)
  audience?: StoryAudience;
}
