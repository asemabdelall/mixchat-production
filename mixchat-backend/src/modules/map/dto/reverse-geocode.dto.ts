import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';

export class ReverseGeocodeDto {
  @ApiProperty({ example: 29.3759, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 47.9774, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ example: 'en-US' })
  @IsOptional()
  @Matches(/^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/)
  language?: string;
}

export class PlaceSuggestionDto {
  @ApiProperty({ example: 'Kuwait City, Kuwait' })
  label!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Kuwait City' })
  city?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Al Asimah' })
  region?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Kuwait' })
  country?: string | null;

  @ApiProperty({ example: 'openstreetmap' })
  provider!: 'openstreetmap';

  @ApiProperty({ example: '© OpenStreetMap contributors' })
  attribution!: string;

  @ApiProperty({
    type: [String],
    example: ['Souq Sharq, Kuwait City', 'Kuwait City, Al Asimah, Kuwait'],
  })
  alternatives!: string[];
}
