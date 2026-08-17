import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteUploadDto {
  @ApiPropertyOptional({
    type: Number,
    example: 1080,
    description: 'Advisory client-extracted media width',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 1080,
    description: 'Advisory client-extracted media height',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 15000,
    description:
      'Advisory client-extracted video/audio duration in milliseconds',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMs?: number;
}
