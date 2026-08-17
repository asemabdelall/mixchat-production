import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FollowRequestItemDto {
  @ApiProperty({ type: String, example: 'req-uuid-12345' })
  id!: string;

  @ApiProperty({ type: String, example: 'user-uuid-12345' })
  requesterId!: string;

  @ApiProperty({ type: String, example: 'alex_creator' })
  username!: string;

  @ApiProperty({ type: String, example: 'Alex Vance' })
  displayName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  })
  avatarUrl?: string | null;

  @ApiProperty({ type: String, example: '2026-08-14T18:30:00.000Z' })
  createdAt!: string;
}

export class PaginatedFollowRequestsDto {
  @ApiProperty({ type: [FollowRequestItemDto] })
  items!: FollowRequestItemDto[];

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'req-uuid-12345',
  })
  nextCursor?: string | null;

  @ApiProperty({ type: Boolean, example: false })
  hasMore!: boolean;

  @ApiProperty({ type: Number, example: 3 })
  totalCount!: number;
}
