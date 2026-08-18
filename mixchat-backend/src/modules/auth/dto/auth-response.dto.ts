import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'alex@mixchat.app' })
  email!: string;

  @ApiProperty({ type: String, example: 'alex_creator' })
  username!: string;

  @ApiProperty({ type: String, example: 'Alex Vance' })
  displayName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Digital creator & tech enthusiast',
  })
  bio?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  })
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
  })
  coverUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://alexvance.design',
  })
  website?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'San Francisco, CA',
  })
  locationCity?: string | null;

  @ApiProperty({ type: Boolean, example: false })
  isPrivate!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  isVerified!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  isPremium!: boolean;

  @ApiProperty({ type: Number, example: 0 })
  followersCount!: number;

  @ApiProperty({ type: Number, example: 0 })
  followingCount!: number;

  @ApiProperty({
    type: String,
    example: 'USER',
    enum: ['USER', 'ADMIN', 'MODERATOR', 'CREATOR'],
  })
  role!: string;

  @ApiProperty({
    type: String,
    example: 'ACTIVE',
    enum: ['ACTIVE', 'SUSPENDED', 'DISABLED'],
  })
  status!: string;

  @ApiProperty({ type: String, example: '2026-08-14T18:30:00.000Z' })
  createdAt!: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserDto })
  user!: UserDto;

  @ApiProperty({
    type: String,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiPropertyOptional({
    type: String,
    example: 'd8e4f1a2...',
    description:
      'Rotating refresh token for cross-origin and mobile PWA fallback storage',
  })
  refreshToken?: string;
}

export class SessionResponseDto {
  @ApiProperty({ type: String, example: 'sess_12345' })
  id!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  })
  userAgent?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '192.168.1.1',
  })
  ipAddress?: string | null;

  @ApiProperty({ type: Boolean, example: true })
  isCurrent!: boolean;

  @ApiProperty({ type: String, example: '2026-08-14T18:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ type: String, example: '2026-08-21T18:30:00.000Z' })
  expiresAt!: string;
}
