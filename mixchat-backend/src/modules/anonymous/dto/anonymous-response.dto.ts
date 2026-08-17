import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnonymousMessageType } from './anonymous-session-actions.dto';

export class AnonymousPersonaDto {
  @ApiProperty({
    description: 'Temporary opaque anonymous participant identifier',
    example: 'anon_p_9f8e7d6c5b4a',
  })
  id!: string;

  @ApiProperty({
    description: 'Temporary generated pseudonym',
    example: 'Anonymous Nova',
  })
  displayName!: string;

  @ApiProperty({
    description: 'Temporary avatar visual asset identifier / seed',
    example: 'nova_gradient',
  })
  avatar!: string;

  @ApiPropertyOptional({
    description: 'Color theme token for UI rendering',
    example: 'from-purple-500 to-cyan-500',
  })
  theme?: string;
}

export class AnonymousMessageDto {
  @ApiProperty({
    description: 'Unique message identifier',
    example: 'anon_msg_123456',
  })
  id!: string;

  @ApiProperty({
    description: 'Anonymous session ID',
    example: 'anon_sess_9a8b7c6d',
  })
  sessionId!: string;

  @ApiProperty({
    description: 'Opaque anonymous participant ID of the sender',
    example: 'anon_p_9f8e7d6c5b4a',
  })
  senderId!: string;

  @ApiProperty({
    description: 'Whether this message was sent by the authenticated viewer',
    example: true,
  })
  isOwn!: boolean;

  @ApiProperty({
    description: 'Type of message',
    enum: AnonymousMessageType,
    example: AnonymousMessageType.TEXT,
  })
  type!: AnonymousMessageType;

  @ApiPropertyOptional({
    description: 'Text content of the message',
    example: 'Hello!',
  })
  content?: string;

  @ApiPropertyOptional({
    description: 'Public media URL for voice notes or images',
    example: 'https://cdn.mixchat.com/media/audio.webm',
  })
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'Voice duration in milliseconds',
    example: 3200,
  })
  voiceDurationMs?: number;

  @ApiProperty({
    description: 'ISO-8601 creation timestamp',
    example: '2026-08-15T12:00:00.000Z',
  })
  createdAt!: string;
}

export class AnonymousRevealedUserDto {
  @ApiProperty({
    description: 'Real user ID (revealed only after mutual consent)',
    example: 'usr_c1a2b3d4e5f6',
  })
  id!: string;

  @ApiProperty({
    description: 'Real username',
    example: 'alex_dev',
  })
  username!: string;

  @ApiProperty({
    description: 'Real display name',
    example: 'Alex Johnson',
  })
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Real avatar URL',
    example: 'https://cdn.mixchat.com/avatars/alex.jpg',
  })
  avatarUrl?: string | null;

  @ApiProperty({
    description: 'Verified badge status',
    example: true,
  })
  isVerified!: boolean;

  @ApiProperty({
    description: 'Premium VIP status',
    example: false,
  })
  isPremium!: boolean;

  @ApiPropertyOptional({
    description: 'User biography',
    example: 'Full-stack builder & tech enthusiast',
  })
  bio?: string | null;
}

export class AnonymousRevealConsentDto {
  @ApiProperty({
    description:
      'Whether authenticated viewer has consented to reveal identity',
    example: true,
  })
  me!: boolean;

  @ApiProperty({
    description: 'Whether anonymous partner has consented to reveal identity',
    example: false,
  })
  partner!: boolean;

  @ApiProperty({
    description: 'Whether both participants have consented to mutual reveal',
    example: false,
  })
  isMutual!: boolean;
}

export class AnonymousSessionDto {
  @ApiProperty({
    description: 'Unique anonymous session ID',
    example: 'anon_sess_9a8b7c6d',
  })
  id!: string;

  @ApiProperty({
    description: 'Current session status',
    enum: ['ACTIVE', 'REVEALED', 'ENDED'],
    example: 'ACTIVE',
  })
  status!: 'ACTIVE' | 'REVEALED' | 'ENDED';

  @ApiPropertyOptional({
    description: 'Reason session ended if applicable',
    enum: ['LEFT', 'SKIPPED', 'DISCONNECTED', 'BLOCKED', 'REPORTED', 'EXPIRED'],
    example: 'SKIPPED',
  })
  endReason?:
    'LEFT' | 'SKIPPED' | 'DISCONNECTED' | 'BLOCKED' | 'REPORTED' | 'EXPIRED';

  @ApiProperty({
    description: 'Authenticated viewer temporary anonymous persona',
    type: AnonymousPersonaDto,
  })
  me!: AnonymousPersonaDto;

  @ApiPropertyOptional({
    description: 'Anonymous partner temporary persona',
    type: AnonymousPersonaDto,
  })
  partner?: AnonymousPersonaDto;

  @ApiProperty({
    description: 'Common matched interests for this session',
    example: ['Technology', 'Gaming'],
    type: [String],
  })
  matchedInterests!: string[];

  @ApiProperty({
    description: 'Reveal consent state machine status',
    type: AnonymousRevealConsentDto,
  })
  revealConsent!: AnonymousRevealConsentDto;

  @ApiPropertyOptional({
    description:
      'Real public profile of partner (populated ONLY after mutual reveal)',
    type: AnonymousRevealedUserDto,
  })
  revealedPartner?: AnonymousRevealedUserDto | null;

  @ApiProperty({
    description: 'Messages exchanged during this anonymous session',
    type: [AnonymousMessageDto],
  })
  messages!: AnonymousMessageDto[];

  @ApiProperty({
    description: 'Session start timestamp',
    example: '2026-08-15T12:00:00.000Z',
  })
  startedAt!: string;

  @ApiProperty({
    description: 'Session expiration timestamp',
    example: '2026-08-15T13:00:00.000Z',
  })
  expiresAt!: string;
}

export class AnonymousQueueStatusDto {
  @ApiProperty({
    description: 'Current matchmaking state for user',
    enum: ['IDLE', 'SEARCHING', 'MATCHED'],
    example: 'SEARCHING',
  })
  status!: 'IDLE' | 'SEARCHING' | 'MATCHED';

  @ApiPropertyOptional({
    description: 'Timestamp when user joined queue',
    example: '2026-08-15T12:00:00.000Z',
  })
  joinedAt?: string;

  @ApiPropertyOptional({
    description: 'Selected interests for search',
    example: ['Technology'],
    type: [String],
  })
  interests?: string[];

  @ApiPropertyOptional({
    description: 'Active anonymous session if status is MATCHED',
    type: AnonymousSessionDto,
  })
  session?: AnonymousSessionDto | null;
}

export class AnonymousActionResponseDto {
  @ApiProperty({
    description: 'Indicates if the operation succeeded',
    example: true,
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: 'Optional human-readable confirmation message',
    example: 'Successfully left queue',
  })
  message?: string;
}

export class AnonymousReportResponseDto {
  @ApiProperty({
    description: 'Indicates if the report was saved',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Created report record ID',
    example: 'rep_12345678',
  })
  reportId!: string;
}
