import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ChatService } from '../chat.service';
import { PresenceService } from './presence.service';
import { TypingService } from './typing.service';
import { RealtimeEvents, SocketUserContext } from './realtime-events';
import {
  JoinConversationDto,
  LeaveConversationDto,
  TypingDto,
  PresenceGetDto,
  SendMessageSocketDto,
  MarkReadSocketDto,
} from './dto/realtime-socket.dto';
import { MessageResponseDto } from '../dto/chat-response.dto';
import { RateLimitService } from '../../../common/rate-limit/rate-limit.service';

const socketFrontendOrigin = (
  process.env.FRONTEND_URL || 'http://localhost:3000'
).replace(/\/$/, '');
const socketAllowedOrigins = new Set([
  socketFrontendOrigin,
  ...(process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://127.0.0.1:3000']),
]);

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const normalized = origin?.replace(/\/$/, '');
      callback(null, !normalized || socketAllowedOrigins.has(normalized));
    },
    credentials: true,
  },
  maxHttpBufferSize: 1_000_000,
  perMessageDeflate: false,
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
    private readonly typingService: TypingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('Chat WebSocket Gateway initialized on namespace /chat');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization
          ? client.handshake.headers.authorization.replace('Bearer ', '')
          : null);

      if (!token) {
        this.logger.debug(
          `Socket connection rejected: No auth token provided (socketId=${client.id})`,
        );
        client.disconnect(true);
        return;
      }

      const jwtSecret =
        this.configService.get<string>('jwt.secret') ||
        'mixchat_jwt_super_secret_development_key_32bytes_long';

      const payload = this.jwtService.verify(token, { secret: jwtSecret });

      if (!payload || !payload.sub || !payload.sessionId) {
        this.logger.debug(
          `Socket connection rejected: Invalid JWT payload (socketId=${client.id})`,
        );
        client.disconnect(true);
        return;
      }

      const session = await this.prisma.authSession.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        this.logger.debug(
          `Socket connection rejected: Session expired or revoked (socketId=${client.id})`,
        );
        client.disconnect(true);
        return;
      }

      if (!session.user || session.user.status === 'DISABLED') {
        this.logger.debug(
          `Socket connection rejected: User disabled or missing (socketId=${client.id})`,
        );
        client.disconnect(true);
        return;
      }

      const userContext: SocketUserContext = {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        displayName: session.user.displayName || session.user.username,
        role: session.user.role,
        sessionId: session.id,
      };

      client.data = userContext;

      // Join private user-scoped room
      await client.join(`user:${userContext.id}`);

      // Track presence in Redis
      const presenceResult =
        await this.presenceService.registerSocketConnection(
          userContext.id,
          client.id,
        );

      if (presenceResult.transitioned && presenceResult.status === 'ONLINE') {
        await this.broadcastPresenceUpdate(userContext.id, {
          userId: userContext.id,
          status: 'ONLINE',
        });
      }

      this.logger.log(
        `Authenticated socket connected: user=${userContext.username} (${userContext.id}) socketId=${client.id}`,
      );
    } catch (error) {
      this.logger.debug(
        `Socket connection handshake error: ${(error as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userContext = client.data as SocketUserContext | undefined;
    if (userContext && userContext.id) {
      const result = await this.presenceService.unregisterSocketConnection(
        userContext.id,
        client.id,
      );

      if (result.transitioned && result.status === 'OFFLINE') {
        try {
          await this.broadcastPresenceUpdate(userContext.id, {
            userId: userContext.id,
            status: 'OFFLINE',
            lastSeen: result.lastSeen,
          });
        } catch {
          // Ignore emit error if adapter is closing
        }
      }

      this.logger.log(
        `Socket disconnected: user=${userContext.username} socketId=${client.id}`,
      );
    }
  }

  /**
   * Client joins an authorized conversation room.
   */
  @SubscribeMessage(RealtimeEvents.CHAT_JOIN)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinConversationDto,
  ) {
    const user = client.data as SocketUserContext;
    if (!user?.id || !payload?.conversationId) {
      return { ok: false, error: 'Unauthorized or missing conversationId' };
    }

    try {
      // Verify membership using canonical Phase 8 ChatService rules
      await this.chatService.assertMembership(user.id, payload.conversationId);
      const room = `conversation:${payload.conversationId}`;
      await client.join(room);
      this.logger.debug(`User ${user.username} joined room ${room}`);
      return { ok: true, conversationId: payload.conversationId };
    } catch (error) {
      this.logger.warn(
        `User ${user.username} failed to join room ${payload.conversationId}: ${(error as Error).message}`,
      );
      return { ok: false, error: (error as Error).message };
    }
  }

  /**
   * Client leaves a conversation room.
   */
  @SubscribeMessage(RealtimeEvents.CHAT_LEAVE)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveConversationDto,
  ) {
    const user = client.data as SocketUserContext;
    if (!user?.id || !payload?.conversationId) return { ok: true };

    const room = `conversation:${payload.conversationId}`;
    await client.leave(room);
    await this.typingService.stopTyping(payload.conversationId, user.id);
    return { ok: true, conversationId: payload.conversationId };
  }

  /**
   * Canonical Realtime Message Send.
   * Invokes canonical Phase 8 ChatService.sendMessage(), persists to PostgreSQL first,
   * then fans out realtime event to room and user channels.
   */
  @SubscribeMessage(RealtimeEvents.MESSAGE_SEND)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageSocketDto,
  ) {
    const user = client.data as SocketUserContext;
    if (!user?.id) {
      return { ok: false, error: 'Unauthorized' };
    }

    const { conversationId, ...sendDto } = payload;
    if (!conversationId) {
      return { ok: false, error: 'conversationId is required' };
    }

    try {
      await this.rateLimit.checkRateLimit(user.id, {
        action: 'WS_MESSAGE_SEND',
        limit: 60,
        windowSeconds: 60,
      });

      // Persist atomically through canonical Phase 8 ChatService
      const message = await this.chatService.sendMessage(
        user.id,
        conversationId,
        sendDto,
      );

      // Stop typing state for sender
      await this.typingService.stopTyping(conversationId, user.id);
      client
        .to(`conversation:${conversationId}`)
        .emit(RealtimeEvents.TYPING_UPDATE, {
          conversationId,
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          isTyping: false,
        });

      // Broadcast canonical MessageResponseDto to active room and all participants
      await this.broadcastNewMessage(conversationId, message);

      return { ok: true, data: message };
    } catch (error) {
      this.logger.warn(
        `Failed to send message via socket: ${(error as Error).message}`,
      );
      return { ok: false, error: (error as Error).message };
    }
  }

  /**
   * Broadcast canonical new message to conversation room and all participant user rooms.
   */
  async broadcastNewMessage(
    conversationId: string,
    message: MessageResponseDto,
  ) {
    if (!this.server) return;

    // 1. Broadcast to active conversation room
    this.server
      .to(`conversation:${conversationId}`)
      .emit(RealtimeEvents.MESSAGE_NEW, message);

    // 2. Broadcast to all participants for sidebar updates
    try {
      const participants = await this.prisma.conversationParticipant.findMany({
        where: { conversationId, leftAt: null },
        select: { userId: true },
      });

      for (const p of participants) {
        this.server
          .to(`user:${p.userId}`)
          .emit(RealtimeEvents.CONVERSATION_UPDATED, {
            conversationId,
            lastMessage: message,
          });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to broadcast conversation update: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Realtime Typing Start.
   */
  @SubscribeMessage(RealtimeEvents.TYPING_START)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingDto,
  ) {
    const user = client.data as SocketUserContext;
    if (!user?.id || !payload?.conversationId) return;

    try {
      await this.rateLimit.checkRateLimit(user.id, {
        action: 'WS_TYPING',
        limit: 30,
        windowSeconds: 10,
      });
      await this.chatService.assertMembership(user.id, payload.conversationId);
      await this.typingService.startTyping(payload.conversationId, user.id);

      client
        .to(`conversation:${payload.conversationId}`)
        .emit(RealtimeEvents.TYPING_UPDATE, {
          conversationId: payload.conversationId,
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          isTyping: true,
        });
    } catch {
      // Silently ignore typing errors for non-members
    }
  }

  /**
   * Realtime Typing Stop.
   */
  @SubscribeMessage(RealtimeEvents.TYPING_STOP)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingDto,
  ) {
    const user = client.data as SocketUserContext;
    if (!user?.id || !payload?.conversationId) return;

    try {
      await this.chatService.assertMembership(user.id, payload.conversationId);
      await this.typingService.stopTyping(payload.conversationId, user.id);

      client
        .to(`conversation:${payload.conversationId}`)
        .emit(RealtimeEvents.TYPING_UPDATE, {
          conversationId: payload.conversationId,
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          isTyping: false,
        });
    } catch {
      // Silently ignore
    }
  }

  /**
   * Realtime Read Receipt.
   */
  @SubscribeMessage(RealtimeEvents.MESSAGE_READ)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MarkReadSocketDto,
  ) {
    const user = client.data as SocketUserContext;
    if (!user?.id || !payload?.conversationId || !payload?.lastReadMessageId) {
      return { ok: false, error: 'Invalid read payload' };
    }

    try {
      const readState = await this.chatService.markRead(
        user.id,
        payload.conversationId,
        {
          lastReadMessageId: payload.lastReadMessageId,
        },
      );

      const receiptPayload = {
        conversationId: payload.conversationId,
        userId: user.id,
        lastReadMessageId: readState.lastReadMessageId,
        lastReadAt: readState.lastReadAt,
        unreadCount: readState.unreadCount,
      };

      // Broadcast read receipt to the conversation room and participant user rooms
      this.server
        .to(`conversation:${payload.conversationId}`)
        .emit(RealtimeEvents.MESSAGE_READ_RECEIPT, receiptPayload);

      return { ok: true, data: readState };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }

  /**
   * Realtime Batch Presence Query.
   */
  @SubscribeMessage(RealtimeEvents.PRESENCE_GET)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async handlePresenceGet(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PresenceGetDto,
  ) {
    const user = client.data as SocketUserContext;
    if (!user?.id || !payload?.userIds) return { ok: false, presence: {} };

    try {
      await this.rateLimit.checkRateLimit(user.id, {
        action: 'WS_PRESENCE_GET',
        limit: 30,
        windowSeconds: 60,
      });
      const authorizedIds = await this.getAuthorizedPresenceTargets(
        user.id,
        payload.userIds,
      );
      const presence = await this.presenceService.getPresence(authorizedIds);
      return { ok: true, presence };
    } catch (error) {
      return { ok: false, presence: {}, error: (error as Error).message };
    }
  }

  private async getAuthorizedPresenceTargets(
    requesterId: string,
    requestedIds: string[],
  ): Promise<string[]> {
    const uniqueIds = [...new Set(requestedIds)].slice(0, 100);
    const memberships = await this.prisma.conversationParticipant.findMany({
      where: { userId: requesterId, leftAt: null },
      select: { conversationId: true },
    });
    const conversationIds = memberships.map((item) => item.conversationId);

    const [participants, blocks] = await Promise.all([
      conversationIds.length === 0
        ? Promise.resolve([])
        : this.prisma.conversationParticipant.findMany({
            where: {
              conversationId: { in: conversationIds },
              userId: { in: uniqueIds },
              leftAt: null,
            },
            select: { userId: true },
            distinct: ['userId'],
          }),
      this.prisma.block.findMany({
        where: {
          OR: [
            { blockerId: requesterId, blockedId: { in: uniqueIds } },
            { blockerId: { in: uniqueIds }, blockedId: requesterId },
          ],
        },
        select: { blockerId: true, blockedId: true },
      }),
    ]);

    const blockedIds = new Set(
      blocks.map((block) =>
        block.blockerId === requesterId ? block.blockedId : block.blockerId,
      ),
    );
    const authorized = new Set(participants.map((item) => item.userId));
    if (uniqueIds.includes(requesterId)) authorized.add(requesterId);

    return uniqueIds.filter((id) => authorized.has(id) && !blockedIds.has(id));
  }

  private async broadcastPresenceUpdate(
    subjectUserId: string,
    payload: {
      userId: string;
      status: 'ONLINE' | 'OFFLINE';
      lastSeen?: string;
    },
  ): Promise<void> {
    const ownMemberships = await this.prisma.conversationParticipant.findMany({
      where: { userId: subjectUserId, leftAt: null },
      select: { conversationId: true },
    });
    const conversationIds = ownMemberships.map((item) => item.conversationId);
    if (conversationIds.length === 0) return;

    const audience = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId: { in: conversationIds },
        userId: { not: subjectUserId },
        leftAt: null,
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const recipient of audience) {
      this.server
        .to(`user:${recipient.userId}`)
        .emit(RealtimeEvents.PRESENCE_UPDATE, payload);
    }
  }
}
