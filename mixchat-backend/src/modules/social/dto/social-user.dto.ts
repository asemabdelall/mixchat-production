import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RelationshipState } from '@prisma/client';

export class SocialUserItemDto {
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

  @ApiProperty({ type: Boolean, example: false })
  isPrivate!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  isVerified!: boolean;

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
    example: 'FOLLOWING',
  })
  relationshipState!: RelationshipState;

  @ApiPropertyOptional({ type: Boolean, example: false })
  isCloseFriend?: boolean;
}

export class PaginatedSocialUsersDto {
  @ApiProperty({ type: [SocialUserItemDto] })
  items!: SocialUserItemDto[];

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  nextCursor?: string | null;

  @ApiProperty({ type: Boolean, example: false })
  hasMore!: boolean;

  @ApiProperty({ type: Number, example: 42 })
  totalCount!: number;
}
