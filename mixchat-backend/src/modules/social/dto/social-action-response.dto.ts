import { ApiProperty } from '@nestjs/swagger';
import { RelationshipState } from '@prisma/client';

export class RelationshipActionResponseDto {
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

  @ApiProperty({ type: String, example: 'Followed successfully' })
  message!: string;
}

export class SimpleMessageResponseDto {
  @ApiProperty({ type: String, example: 'Action completed successfully' })
  message!: string;
}

export class AcceptFollowRequestResponseDto {
  @ApiProperty({ type: String, example: 'Follow request accepted' })
  message!: string;

  @ApiProperty({
    type: Object,
    example: { id: 'user_123', username: 'alex' },
  })
  follower!: {
    id: string;
    username: string;
  };
}
