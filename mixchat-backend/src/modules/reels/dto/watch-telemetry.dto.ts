import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class WatchStartDto {
  @ApiProperty({
    description: 'Unique client-generated session UUID',
    example: 'a5712792-5645-4eef-a0d0-e14b533db539',
  })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}

export class WatchProgressDto {
  @ApiProperty({
    description: 'Client-generated session UUID',
    example: 'a5712792-5645-4eef-a0d0-e14b533db539',
  })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({
    description: 'Accumulated active watch time in milliseconds',
    example: 3200,
    minimum: 0,
    maximum: 3600000,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3600000)
  watchedMs!: number;

  @ApiProperty({
    description: 'Maximum playback timestamp reached in milliseconds',
    example: 3200,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxProgressMs!: number;

  @ApiPropertyOptional({
    description: 'Video media duration in milliseconds',
    example: 15000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMs?: number;

  @ApiPropertyOptional({
    description: 'Completion ratio between 0.0 and 1.0',
    example: 0.25,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  completionRatio?: number;

  @ApiPropertyOptional({
    description: 'Number of times video has looped/replayed in this session',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  replayCount?: number;
}

export class WatchEndDto extends WatchProgressDto {
  @ApiPropertyOptional({
    description: 'Explicit flag indicating user watched to completion',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export class WatchTelemetryResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    description:
      'True if this session crossed the qualified view threshold (>=2s or >=50%)',
    example: true,
  })
  isQualifiedView!: boolean;

  @ApiProperty({
    description: 'True if this session reached >=90% completion',
    example: false,
  })
  isCompleted!: boolean;
}
