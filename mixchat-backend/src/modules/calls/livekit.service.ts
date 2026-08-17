import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

export interface GenerateTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  ttl?: string;
  metadata?: string;
}

export interface LiveKitConnectionInfo {
  serverUrl: string;
  participantToken: string;
}

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check if LiveKit Cloud credentials are fully configured
   */
  isConfigured(): boolean {
    const apiKey = this.configService.get<string>('livekit.apiKey');
    const apiSecret = this.configService.get<string>('livekit.apiSecret');
    const url = this.configService.get<string>('livekit.url');
    return !!(
      apiKey &&
      apiSecret &&
      url &&
      apiKey !== 'devkey' &&
      apiSecret !== 'secret'
    );
  }

  /**
   * Generate an authenticated, short-lived, user- and room-scoped LiveKit AccessToken
   */
  async generateParticipantToken(
    options: GenerateTokenOptions,
  ): Promise<LiveKitConnectionInfo> {
    const apiKey = this.configService.get<string>('livekit.apiKey') || 'devkey';
    const apiSecret =
      this.configService.get<string>('livekit.apiSecret') || 'secret';
    const serverUrl =
      this.configService.get<string>('livekit.url') ||
      'wss://livekit.example.com';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: options.participantIdentity,
      name: options.participantName,
      metadata: options.metadata || undefined,
      ttl: options.ttl || '1h',
    });

    const grant: VideoGrant = {
      room: options.roomName,
      roomJoin: true,
      canPublish: options.canPublish ?? true,
      canSubscribe: options.canSubscribe ?? true,
      canPublishData: true,
      roomAdmin: false, // Normal participants must NEVER have roomAdmin
    };

    at.addGrant(grant);

    const participantToken = await at.toJwt();

    this.logger.log(
      `[livekit_token_issued] room=${options.roomName} user=${options.participantIdentity}`,
    );

    return {
      serverUrl,
      participantToken,
    };
  }
}
