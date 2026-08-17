import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({
    description: 'Latitude coordinate (-90 to 90 degrees)',
    example: 37.7749,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({
    description: 'Longitude coordinate (-180 to 180 degrees)',
    example: -122.4194,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({
    description: 'Estimated accuracy radius in meters',
    example: 15.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @ApiPropertyOptional({
    description: 'Direction of travel in degrees (0-360, clockwise from North)',
    example: 180,
  })
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiPropertyOptional({
    description: 'Speed in meters per second',
    example: 1.2,
  })
  @IsOptional()
  @IsNumber()
  speed?: number;
}
