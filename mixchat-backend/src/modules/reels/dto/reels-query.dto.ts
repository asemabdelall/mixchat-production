import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ReelsQueryDto {
  @ApiPropertyOptional({
    description: 'Feed algorithm selection',
    enum: ['foryou', 'following'],
    default: 'foryou',
  })
  @IsOptional()
  @IsIn(['foryou', 'following'])
  feed?: 'foryou' | 'following' = 'foryou';

  @ApiPropertyOptional({
    description: 'Opaque cursor string for pagination',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of reels to retrieve (1-30)',
    default: 10,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number = 10;
}
