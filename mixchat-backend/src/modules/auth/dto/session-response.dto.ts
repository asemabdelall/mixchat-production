import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({ example: 's1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: '192.168.1.1', nullable: true })
  ipAddress!: string | null;

  @ApiProperty({
    example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
    nullable: true,
  })
  userAgent!: string | null;

  @ApiProperty({ example: '2026-08-14T18:30:00.000Z' })
  lastUsedAt!: string;

  @ApiProperty({ example: '2026-08-14T18:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({
    example: true,
    description: 'True if this is the active session sending the request',
  })
  isCurrent!: boolean;
}
