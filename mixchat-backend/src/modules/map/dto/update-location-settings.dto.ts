import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { LocationVisibility } from '@prisma/client';

export class UpdateLocationSettingsDto {
  @ApiPropertyOptional({
    description:
      'Whether Ghost Mode is enabled (hides location completely from all users)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isGhostMode?: boolean;

  @ApiPropertyOptional({
    description: 'Audience allowed to view location when not in Ghost Mode',
    enum: LocationVisibility,
    example: LocationVisibility.FRIENDS,
  })
  @IsOptional()
  @IsEnum(LocationVisibility)
  visibility?: LocationVisibility;
}
