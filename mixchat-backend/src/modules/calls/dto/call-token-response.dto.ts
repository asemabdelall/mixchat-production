import { ApiProperty } from '@nestjs/swagger';

export class CallTokenResponseDto {
  @ApiProperty({
    description: 'LiveKit Cloud Server WSS URL',
    example: 'wss://mixchat-app.livekit.cloud',
  })
  serverUrl!: string;

  @ApiProperty({
    description: 'Scoped JWT AccessToken for LiveKit Room',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  participantToken!: string;

  @ApiProperty({
    description: 'LiveKit Room Name',
    example: 'mixchat-call-123e4567-e89b-12d3-a456-426614174000',
  })
  roomName!: string;
}
