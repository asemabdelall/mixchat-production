import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CallType,
  CallStatus,
  CallEndReason,
  CallParticipantStatus,
} from '@prisma/client';

export class CallParticipantDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId!: string;

  @ApiProperty({ example: 'ahmed' })
  username!: string;

  @ApiProperty({ example: 'Ahmed Ali' })
  displayName!: string;

  @ApiPropertyOptional({ example: 'https://cdn.mixchat.app/avatars/user.jpg' })
  avatarUrl?: string | null;

  @ApiProperty({ enum: CallParticipantStatus, example: 'INVITED' })
  status!: CallParticipantStatus;

  @ApiProperty({ example: '2026-08-17T00:00:00.000Z' })
  invitedAt!: string;

  @ApiPropertyOptional({ example: '2026-08-17T00:00:05.000Z' })
  joinedAt?: string | null;

  @ApiPropertyOptional({ example: '2026-08-17T00:05:00.000Z' })
  leftAt?: string | null;
}

export class CallResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  conversationId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  initiatorId!: string;

  @ApiProperty({
    description: 'Initiator user summary',
  })
  initiator!: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };

  @ApiProperty({ enum: CallType, example: 'VOICE' })
  type!: CallType;

  @ApiProperty({ enum: CallStatus, example: 'RINGING' })
  status!: CallStatus;

  @ApiProperty({ example: 'mixchat-call-123e4567-e89b-12d3-a456-426614174000' })
  livekitRoomName!: string;

  @ApiPropertyOptional({ example: '2026-08-17T00:00:00.000Z' })
  ringingAt?: string | null;

  @ApiPropertyOptional({ example: '2026-08-17T00:00:05.000Z' })
  answeredAt?: string | null;

  @ApiPropertyOptional({ example: '2026-08-17T00:05:00.000Z' })
  endedAt?: string | null;

  @ApiProperty({ example: 120 })
  durationSeconds!: number;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  endedByUserId?: string | null;

  @ApiPropertyOptional({ enum: CallEndReason, example: 'COMPLETED' })
  endReason?: CallEndReason | null;

  @ApiProperty({ type: [CallParticipantDto] })
  participants!: CallParticipantDto[];

  @ApiPropertyOptional({
    description: 'Fresh LiveKit connection token if user is actively in call',
  })
  livekit?: {
    serverUrl: string;
    participantToken: string;
  };

  @ApiProperty({ example: '2026-08-17T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-17T00:00:00.000Z' })
  updatedAt!: string;
}
