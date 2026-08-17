import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CommentsQueryDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Opaque base64url cursor for pagination',
    example:
      'eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTE0VDIwOjAwOjAwLjAwMFoiLCJpZCI6IjEyMyJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Number of comments to return (default: 20, max: 50)',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
