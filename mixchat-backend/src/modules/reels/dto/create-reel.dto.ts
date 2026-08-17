import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PostVisibility } from '@prisma/client';

export class CreateReelDto {
  @ApiProperty({
    description: 'UUID of the READY video MediaObject',
    example: 'd3b07384-d113-40e1-a64d-9a9ecf4a66a1',
  })
  @IsUUID()
  @IsNotEmpty()
  mediaObjectId!: string;

  @ApiPropertyOptional({
    description: 'Optional UUID of the image poster MediaObject',
    example: 'e4c18495-e224-41f2-b75e-0b0fdf5b77b2',
  })
  @IsUUID()
  @IsOptional()
  posterMediaObjectId?: string;

  @ApiPropertyOptional({
    description: 'Reel caption text with hashtags & mentions',
    maxLength: 2200,
    example: 'Check out this awesome sunset video! #vibes #mixchat',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2200)
  caption?: string;

  @ApiPropertyOptional({
    description: 'Optional soundtrack / audio track title',
    maxLength: 150,
    example: 'Original Audio - MixChat Sounds',
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  audioTitle?: string;

  @ApiPropertyOptional({
    description: 'Optional location tag name',
    maxLength: 100,
    example: 'Venice Beach, CA',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  locationTag?: string;

  @ApiPropertyOptional({
    description: 'Audience visibility scope',
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
    example: PostVisibility.PUBLIC,
  })
  @IsEnum(PostVisibility)
  @IsOptional()
  visibility?: PostVisibility = PostVisibility.PUBLIC;
}
