import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import {
  RealtimeEvents,
  SocketUserContext,
} from '../chat/realtime/realtime-events';
import { AnonymousSessionService } from './anonymous-session.service';
import { AnonymousMatchmakingStore } from './anonymous-matchmaking.store';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SendAnonymousMessageDto } from './dto/anonymous-session-actions.dto';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class AnonymousGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AnonymousGateway.name);

  constructor(
    private readonly sessionService: AnonymousSessionService,
    private readonly store: AnonymousMatchmakingStore,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper: extract authenticated user from socket data.
   */
  private getAuthUser(client: Socket): SocketUserContext | null {
    return client.data?.user || null;
  }

  /**
   * Helper: broadcast match found event to both participants.
   */
  async broadcastMatchFound(
    sessionId: string,
    userAId: string,
    userBId: string,
  ): Promise<void> {
    try {
      const sessionDtoA = await this.sessionService.getSessionDto(
        sessionId,
        userAId,
      );
      const sessionDtoB = await this.sessionService.getSessionDto(
        sessionId,
        userBId,
      );

      this.server
        .to(`user:${userAId}`)
        .emit(RealtimeEvents.ANONYMOUS_MATCH_FOUND, sessionDtoA);
      this.server
        .to(`user:${userBId}`)
        .emit(RealtimeEvents.ANONYMOUS_MATCH_FOUND, sessionDtoB);
    } catch (err: unknown) {
      this.logger.error(
        `[AnonymousGateway] Failed to broadcast match found: ${String(err)}`,
      );
    }
  }

  /**
   * Realtime Message Send handler.
   */
  @SubscribeMessage(RealtimeEvents.ANONYMOUS_MESSAGE_SEND)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string } & SendAnonymousMessageDto,
  ) {
    const user = this.getAuthUser(client);
    if (!user) {
      return { ok: false, error: 'Unauthorized socket' };
    }

    try {
      const { message, partnerUserId } = await this.sessionService.sendMessage(
        payload.sessionId,
        user.id,
        payload,
      );

      // Emit to partner with isOwn = false
      this.server
        .to(`user:${partnerUserId}`)
        .emit(RealtimeEvents.ANONYMOUS_MESSAGE_NEW, {
          ...message,
          isOwn: false,
        });

      return {
        ok: true,
        data: {
          ...message,
          isOwn: true,
        },
      };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to send message';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Typing Start indicator.
   */
  @SubscribeMessage(RealtimeEvents.ANONYMOUS_TYPING_START)
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const user = this.getAuthUser(client);
    if (!user || !payload?.sessionId) return { ok: false };

    try {
      const session = await this.store.getSession(payload.sessionId);
      if (!session || session.status === 'ENDED') return { ok: false };

      const isUserA = session.participantA.userId === user.id;
      const isUserB = session.participantB.userId === user.id;
      if (!isUserA && !isUserB) return { ok: false };

      const partnerUserId = isUserA
        ? session.participantB.userId
        : session.participantA.userId;

      await this.store.setTyping(payload.sessionId, user.id, true);

      // Emit typing event to partner with ZERO real user identity fields
      this.server
        .to(`user:${partnerUserId}`)
        .emit(RealtimeEvents.ANONYMOUS_TYPING_UPDATE, {
          sessionId: payload.sessionId,
          isTyping: true,
        });

      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Typing Stop indicator.
   */
  @SubscribeMessage(RealtimeEvents.ANONYMOUS_TYPING_STOP)
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const user = this.getAuthUser(client);
    if (!user || !payload?.sessionId) return { ok: false };

    try {
      const session = await this.store.getSession(payload.sessionId);
      if (!session || session.status === 'ENDED') return { ok: false };

      const isUserA = session.participantA.userId === user.id;
      const isUserB = session.participantB.userId === user.id;
      if (!isUserA && !isUserB) return { ok: false };

      const partnerUserId = isUserA
        ? session.participantB.userId
        : session.participantA.userId;

      await this.store.setTyping(payload.sessionId, user.id, false);

      this.server
        .to(`user:${partnerUserId}`)
        .emit(RealtimeEvents.ANONYMOUS_TYPING_UPDATE, {
          sessionId: payload.sessionId,
          isTyping: false,
        });

      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Mutual Reveal Request / Acceptance.
   */
  @SubscribeMessage(RealtimeEvents.ANONYMOUS_REVEAL_REQUEST)
  async handleRevealRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const user = this.getAuthUser(client);
    if (!user || !payload?.sessionId) {
      return { ok: false, error: 'Unauthorized socket' };
    }

    try {
      const { isMutual, session, partnerUserId } =
        await this.sessionService.requestReveal(payload.sessionId, user.id);

      if (isMutual) {
        // Mutual consent reached! Fetch real public profile summaries for both participants
        const userA = await this.prisma.user.findUnique({
          where: { id: session.participantA.userId },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            isPremium: true,
            bio: true,
          },
        });

        const userB = await this.prisma.user.findUnique({
          where: { id: session.participantB.userId },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            isPremium: true,
            bio: true,
          },
        });

        // Emit revealed partner profile to User A
        this.server
          .to(`user:${session.participantA.userId}`)
          .emit(RealtimeEvents.ANONYMOUS_IDENTITY_REVEALED, {
            sessionId: session.id,
            revealedPartner: userB
              ? {
                  id: userB.id,
                  username: userB.username,
                  displayName: userB.displayName || userB.username,
                  avatarUrl: userB.avatarUrl,
                  isVerified: userB.isVerified,
                  isPremium: userB.isPremium,
                  bio: userB.bio,
                }
              : null,
          });

        // Emit revealed partner profile to User B
        this.server
          .to(`user:${session.participantB.userId}`)
          .emit(RealtimeEvents.ANONYMOUS_IDENTITY_REVEALED, {
            sessionId: session.id,
            revealedPartner: userA
              ? {
                  id: userA.id,
                  username: userA.username,
                  displayName: userA.displayName || userA.username,
                  avatarUrl: userA.avatarUrl,
                  isVerified: userA.isVerified,
                  isPremium: userA.isPremium,
                  bio: userA.bio,
                }
              : null,
          });

        return { ok: true, isMutual: true };
      } else {
        // One-sided consent: notify partner of request with ZERO real identity data
        this.server
          .to(`user:${partnerUserId}`)
          .emit(RealtimeEvents.ANONYMOUS_REVEAL_REQUESTED, {
            sessionId: session.id,
          });

        return { ok: true, isMutual: false };
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to request reveal';
      return { ok: false, error: errorMsg };
    }
  }

  /**
   * Cancel Reveal Request.
   */
  @SubscribeMessage(RealtimeEvents.ANONYMOUS_REVEAL_CANCEL)
  async handleRevealCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const user = this.getAuthUser(client);
    if (!user || !payload?.sessionId) return { ok: false };

    try {
      const { session, partnerUserId } = await this.sessionService.cancelReveal(
        payload.sessionId,
        user.id,
      );

      this.server
        .to(`user:${partnerUserId}`)
        .emit(RealtimeEvents.ANONYMOUS_REVEAL_CANCELLED, {
          sessionId: session.id,
        });

      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Explicit Leave command over socket.
   */
  @SubscribeMessage(RealtimeEvents.ANONYMOUS_LEAVE)
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const user = this.getAuthUser(client);
    if (!user || !payload?.sessionId) return { ok: false };

    try {
      const { partnerUserId } = await this.sessionService.leaveSession(
        payload.sessionId,
        user.id,
      );

      this.server
        .to(`user:${partnerUserId}`)
        .emit(RealtimeEvents.ANONYMOUS_PARTNER_LEFT, {
          sessionId: payload.sessionId,
          reason: 'LEFT',
        });

      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}
