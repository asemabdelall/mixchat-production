import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StoryPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Opaque base64 cursor for keyset pagination',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTE0VDE5OjAwOjAwLjAwMFoiLCJpZCI6InN0b3J5LTEyMyJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return (1-50)',
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
