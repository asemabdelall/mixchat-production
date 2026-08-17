import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationVisibility } from '@prisma/client';

export class LocationSettingsResponseDto {
  @ApiProperty({
    description: 'Whether Ghost Mode is enabled',
    example: false,
  })
  isGhostMode!: boolean;

  @ApiProperty({
    description: 'Who can view shared location',
    enum: LocationVisibility,
    example: LocationVisibility.FRIENDS,
  })
  visibility!: LocationVisibility;

  @ApiProperty({
    description: 'ISO timestamp when location settings were last updated',
    example: '2026-08-15T12:00:00.000Z',
  })
  updatedAt!: string;
}

export class MapUserSummaryDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: 'd3b07384-d113-46fb-9b22-480998f5728a',
  })
  id!: string;

  @ApiProperty({
    description: 'Unique username',
    example: 'sophiachen',
  })
  username!: string;

  @ApiProperty({
    description: 'Display name',
    example: 'Sophia Chen',
  })
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Avatar image URL',
    nullable: true,
    example: 'https://cdn.mixchat.app/avatars/sophia.webp',
  })
  avatarUrl!: string | null;

  @ApiProperty({
    description: 'Verified badge status',
    example: true,
  })
  isVerified!: boolean;

  @ApiProperty({
    description: 'Premium badge status',
    example: false,
  })
  isPremium!: boolean;
}

export class MapLocationCoordinatesDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 37.7749,
  })
  latitude!: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -122.4194,
  })
  longitude!: number;

  @ApiProperty({
    description: 'Accuracy radius in meters',
    example: 15.2,
  })
  accuracy!: number;

  @ApiProperty({
    description: 'ISO timestamp when coordinates were updated',
    example: '2026-08-15T12:05:00.000Z',
  })
  updatedAt!: string;
}

export class MapFriendDto {
  @ApiProperty({
    description: 'Friend user profile summary',
    type: () => MapUserSummaryDto,
  })
  user!: MapUserSummaryDto;

  @ApiProperty({
    description: 'Ephemeral live location coordinates',
    type: () => MapLocationCoordinatesDto,
  })
  location!: MapLocationCoordinatesDto;

  @ApiPropertyOptional({
    description: 'Whether the friend currently has an active 24h story',
    example: true,
  })
  hasActiveStory?: boolean;

  @ApiPropertyOptional({
    description:
      'Thumbnail / media preview URL of the active story if available',
    nullable: true,
    example: 'https://cdn.mixchat.app/stories/thumb_123.webp',
  })
  storyMediaUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Real-time online presence status',
    example: true,
  })
  isOnline?: boolean;
}

export class MapFriendsResponseDto {
  @ApiProperty({
    description:
      'List of authorized friends currently sharing active non-expired locations',
    type: () => [MapFriendDto],
  })
  friends!: MapFriendDto[];
}

export class LocationUpdateResponseDto {
  @ApiProperty({
    description: 'Whether the location update was accepted and stored in Redis',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description:
      'Whether Ghost Mode is active (if true, coordinates were not saved to Redis)',
    example: false,
  })
  isGhostMode!: boolean;

  @ApiProperty({
    description: 'ISO timestamp of accepted update',
    example: '2026-08-15T12:05:00.000Z',
  })
  updatedAt!: string;
}

export class LocationDeleteResponseDto {
  @ApiProperty({
    description: 'Operation outcome',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'User-facing confirmation message',
    example: 'Location removed successfully',
  })
  message!: string;
}
