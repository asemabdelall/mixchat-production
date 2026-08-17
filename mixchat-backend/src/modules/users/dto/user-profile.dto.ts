import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RelationshipState } from '@prisma/client';

export class PublicProfileDto {
  @ApiProperty({
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id!: string;

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

  @ApiProperty({ type: Number, example: 120 })
  followersCount!: number;

  @ApiProperty({ type: Number, example: 85 })
  followingCount!: number;

  @ApiProperty({
    enum: [
      'NONE',
      'FOLLOWING',
      'REQUESTED',
      'FOLLOWED_BY',
      'MUTUAL',
      'BLOCKED',
      'BLOCKED_BY',
      'SELF',
    ],
    example: 'NONE',
  })
  relationshipState!: RelationshipState;

  @ApiProperty({ type: Boolean, example: false })
  isCloseFriend!: boolean;

  @ApiProperty({ type: String, example: '2026-08-14T18:30:00.000Z' })
  createdAt!: string;
}

export class PrivacySettingsDto {
  @ApiProperty({
    type: String,
    example: 'Everyone',
    enum: ['Everyone', 'My Contacts', 'Nobody'],
  })
  lastSeen!: string;

  @ApiProperty({
    type: String,
    example: 'Everyone',
    enum: ['Everyone', 'My Contacts', 'Nobody'],
  })
  profilePhoto!: string;

  @ApiProperty({
    type: String,
    example: 'exact',
    enum: ['exact', 'approx', 'ghost'],
  })
  locationMode!: string;

  @ApiProperty({ type: Boolean, example: true })
  readReceipts!: boolean;

  @ApiProperty({
    type: String,
    example: 'Everyone',
    enum: ['Everyone', 'Following', 'Nobody'],
  })
  allowMentions!: string;

  @ApiProperty({
    type: String,
    example: 'Everyone',
    enum: ['Everyone', 'Following', 'Nobody'],
  })
  allowDirectMessages!: string;
}
