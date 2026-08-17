import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlockedUserItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiProperty()
  blockedAt!: string;
}

export class PaginatedBlockedUsersDto {
  @ApiProperty({ type: [BlockedUserItemDto] })
  items!: BlockedUserItemDto[];

  @ApiPropertyOptional()
  nextCursor?: string | null;

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty()
  totalCount!: number;
}

export class MutedUserItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiProperty()
  mutedAt!: string;
}

export class PaginatedMutedUsersDto {
  @ApiProperty({ type: [MutedUserItemDto] })
  items!: MutedUserItemDto[];

  @ApiPropertyOptional()
  nextCursor?: string | null;

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty()
  totalCount!: number;
}
