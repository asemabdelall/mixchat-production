import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchUsersQueryDto {
  @ApiProperty({
    type: String,
    example: 'alex',
    description: 'Search keyword matching username or display name',
  })
  @IsString()
  q!: string;

  @ApiPropertyOptional({
    type: Number,
    example: 20,
    default: 20,
    description: 'Number of search results to return (max 50)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
