import { ApiProperty } from '@nestjs/swagger';

export class TrendingTagDto {
  @ApiProperty({ type: String, example: '#cyberpunk' })
  tag!: string;

  @ApiProperty({ type: Number, example: 420 })
  postsCount!: number;

  @ApiProperty({ type: String, example: 'Trending in Technology' })
  category!: string;

  @ApiProperty({ type: Number, example: 89.5 })
  velocityScore!: number;
}

export class TrendingResponseDto {
  @ApiProperty({ type: [TrendingTagDto] })
  items!: TrendingTagDto[];

  @ApiProperty({ type: String, example: '2026-08-14T22:30:00.000Z' })
  updatedAt!: string;
}
