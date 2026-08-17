import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { LiveKitService } from './livekit.service';
import { WebPushService } from '../notifications/web-push.service';
import { ChatGateway } from '../chat/realtime/chat.gateway';
import {
  RealtimeEvents,
  CallEventPayload,
} from '../chat/realtime/realtime-events';
import { CreateCallDto } from './dto/create-call.dto';
import { CallResponseDto } from './dto/call-response.dto';
import { CallTokenResponseDto } from './dto/call-token-response.dto';
import { CallHistoryQueryDto } from './dto/call-history-query.dto';
import {
  CallStatus,
  CallEndReason,
  CallParticipantStatus,
  Prisma,
  NotificationType,
} from '@prisma/client';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { Cron, CronExpression } from '@nestjs/schedule';

const callInclude = {
  initiator: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
} satisfies Prisma.CallSessionInclude;

type CallRecord = Prisma.CallSessionGetPayload<{
  include: typeof callInclude;
}>;

@Injectable()
export class CallsService implements OnModuleDestroy {
  private readonly logger = new Logger(CallsService.name);
  private readonly ringTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly livekitService: LiveKitService,
    private readonly webPushService: WebPushService,
    private readonly rateLimit: RateLimitService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway?: ChatGateway,
  ) {}

  onModuleDestroy() {
    for (const timer of this.ringTimers.values()) {
      clearTimeout(timer);
    }
    this.ringTimers.clear();
  }

  /**
   * Initiate a new 1-to-1 or group call session
   */
  async initiateCall(
    userId: string,
    dto: CreateCallDto,
  ): Promise<CallResponseDto> {
    // 1. Rate limiting: max 10 call creations per minute per user
    await this.rateLimit.checkRateLimit(userId, {
      action: 'call_initiate',
      limit: 10,
      windowSeconds: 60,
    });

    // 2. Validate conversation & participant membership
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const callerMembership = conversation.participants.find(
      (p) => p.userId === userId,
    );
    if (!callerMembership) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // 3. Identify callee (for 1-to-1 conversation)
    const otherParticipants = conversation.participants.filter(
      (p) => p.userId !== userId,
    );
    if (otherParticipants.length === 0) {
      throw new BadRequestException(
        'Cannot initiate a call without participants',
      );
    }

    const primaryCallee = otherParticipants[0].user;

    // 4. Bi-directional block validation
    const blockExists = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: primaryCallee.id },
          { blockerId: primaryCallee.id, blockedId: userId },
        ],
      },
    });

    if (blockExists) {
      throw new ForbiddenException('Cannot call a user who is blocked');
    }

    // 5. One Active Call Policy: check if caller has an ongoing active/ringing call
    const activeCallerCall = await this.prisma.callSession.findFirst({
      where: {
        participants: {
          some: {
            userId,
            status: {
              in: [
                CallParticipantStatus.ACCEPTED,
                CallParticipantStatus.RINGING,
              ],
            },
          },
        },
        status: { in: [CallStatus.RINGING, CallStatus.ACTIVE] },
      },
    });

    if (activeCallerCall) {
      throw new ConflictException(
        'You are already in an active or ringing call',
      );
    }

    // 6. Check if Callee is already in an active/ringing call -> BUSY
    const activeCalleeCall = await this.prisma.callSession.findFirst({
      where: {
        participants: {
          some: {
            userId: primaryCallee.id,
            status: {
              in: [
                CallParticipantStatus.ACCEPTED,
                CallParticipantStatus.RINGING,
              ],
            },
          },
        },
        status: { in: [CallStatus.RINGING, CallStatus.ACTIVE] },
      },
    });

    if (activeCalleeCall) {
      // Emit busy event to caller
      this.emitToUser(userId, RealtimeEvents.CALL_BUSY, {
        callId: 'busy',
        conversationId: dto.conversationId,
        type: dto.type,
        initiator: {
          id: callerMembership.user.id,
          username: callerMembership.user.username,
          displayName: callerMembership.user.displayName,
          avatarUrl: callerMembership.user.avatarUrl,
        },
        livekitRoomName: '',
        status: 'ENDED',
        endReason: 'BUSY',
        createdAt: new Date().toISOString(),
      });

      throw new ConflictException(
        `${primaryCallee.displayName || primaryCallee.username} is currently in another call`,
      );
    }

    // 7. Atomic call creation
    const livekitRoomName = `mixchat-call-${crypto.randomUUID()}`;

    const call = await this.prisma.$transaction(async (tx) => {
      const created = await tx.callSession.create({
        data: {
          conversationId: dto.conversationId,
          initiatorId: userId,
          type: dto.type,
          status: CallStatus.RINGING,
          livekitRoomName,
          ringingAt: new Date(),
          participants: {
            create: [
              {
                userId,
                status: CallParticipantStatus.RINGING,
              },
              {
                userId: primaryCallee.id,
                status: CallParticipantStatus.RINGING,
              },
            ],
          },
        },
        include: callInclude,
      });

      return created;
    });

    // 8. Generate initiator's LiveKit token
    const tokenInfo = await this.livekitService.generateParticipantToken({
      roomName: livekitRoomName,
      participantIdentity: userId,
      participantName:
        callerMembership.user.displayName || callerMembership.user.username,
      canPublish: true,
      canSubscribe: true,
    });

    const responseDto = this.mapToCallResponseDto(call, tokenInfo);

    // 9. Emit realtime events via Socket.IO
    const eventPayload: CallEventPayload = {
      callId: call.id,
      conversationId: call.conversationId,
      type: call.type,
      initiator: {
        id: callerMembership.user.id,
        username: callerMembership.user.username,
        displayName: callerMembership.user.displayName,
        avatarUrl: callerMembership.user.avatarUrl,
      },
      livekitRoomName: call.livekitRoomName,
      status: 'RINGING',
      createdAt: call.createdAt.toISOString(),
    };

    // Notify Callee of incoming call
    this.emitToUser(
      primaryCallee.id,
      RealtimeEvents.CALL_INCOMING,
      eventPayload,
    );

    // Notify Caller that ringing started
    this.emitToUser(userId, RealtimeEvents.CALL_RINGING, eventPayload);

    // 10. Send high-urgency Web Push to callee (for background/offline device wake)
    void this.webPushService.sendIncomingCallPush(primaryCallee.id, {
      id: call.id,
      type: call.type,
      callerName:
        callerMembership.user.displayName || callerMembership.user.username,
      callerAvatar: callerMembership.user.avatarUrl,
      conversationId: call.conversationId,
    });

    // 11. Schedule 30s Server-Side Ring Timeout
    this.scheduleRingTimeout(call.id);

    this.logger.log(
      `[call_initiated] callId=${call.id} type=${call.type} initiator=${userId} callee=${primaryCallee.id}`,
    );

    return responseDto;
  }

  /**
   * Get active or ringing call for authenticated user (for app recovery/reload)
   */
  async getCurrentCall(userId: string): Promise<CallResponseDto | null> {
    const call = await this.prisma.callSession.findFirst({
      where: {
        participants: {
          some: {
            userId,
            status: {
              in: [
                CallParticipantStatus.ACCEPTED,
                CallParticipantStatus.RINGING,
              ],
            },
          },
        },
        status: { in: [CallStatus.RINGING, CallStatus.ACTIVE] },
      },
      include: callInclude,
      orderBy: { createdAt: 'desc' },
    });

    if (!call) return null;

    const userParticipant = call.participants.find((p) => p.userId === userId);
    if (!userParticipant) return null;

    // Issue fresh connection token if call is active or user is ringing initiator
    let tokenInfo: { serverUrl: string; participantToken: string } | undefined;
    if (call.status === CallStatus.ACTIVE || call.initiatorId === userId) {
      tokenInfo = await this.livekitService.generateParticipantToken({
        roomName: call.livekitRoomName,
        participantIdentity: userId,
        participantName:
          userParticipant.user.displayName || userParticipant.user.username,
        canPublish: true,
        canSubscribe: true,
      });
    }

    return this.mapToCallResponseDto(call, tokenInfo);
  }

  /**
   * Get call details by ID (participants only)
   */
  async getCallById(userId: string, callId: string): Promise<CallResponseDto> {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
      include: callInclude,
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const userParticipant = call.participants.find((p) => p.userId === userId);
    if (!userParticipant) {
      throw new ForbiddenException('You are not a participant in this call');
    }

    let tokenInfo: { serverUrl: string; participantToken: string } | undefined;
    if (call.status === CallStatus.ACTIVE || call.initiatorId === userId) {
      tokenInfo = await this.livekitService.generateParticipantToken({
        roomName: call.livekitRoomName,
        participantIdentity: userId,
        participantName:
          userParticipant.user.displayName || userParticipant.user.username,
        canPublish: true,
        canSubscribe: true,
      });
    }

    return this.mapToCallResponseDto(call, tokenInfo);
  }

  /**
   * Request fresh LiveKit connection token for an active call
   */
  async getCallToken(
    userId: string,
    callId: string,
  ): Promise<CallTokenResponseDto> {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
      include: callInclude,
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const participant = call.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this call');
    }

    if (call.status === CallStatus.ENDED) {
      throw new ForbiddenException('Call has already ended');
    }

    const tokenInfo = await this.livekitService.generateParticipantToken({
      roomName: call.livekitRoomName,
      participantIdentity: userId,
      participantName:
        participant.user.displayName || participant.user.username,
      canPublish: true,
      canSubscribe: true,
    });

    return {
      serverUrl: tokenInfo.serverUrl,
      participantToken: tokenInfo.participantToken,
      roomName: call.livekitRoomName,
    };
  }

  /**
   * Accept an incoming call (Callee only)
   */
  async acceptCall(userId: string, callId: string): Promise<CallResponseDto> {
    this.clearRingTimer(callId);

    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
      include: callInclude,
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const calleeParticipant = call.participants.find(
      (p) => p.userId === userId && p.userId !== call.initiatorId,
    );

    if (!calleeParticipant) {
      throw new ForbiddenException('Only the callee can accept this call');
    }

    if (call.status === CallStatus.ENDED) {
      throw new ConflictException(
        `Call has already ended (${call.endReason || 'COMPLETED'})`,
      );
    }

    if (call.status === CallStatus.ACTIVE) {
      // Idempotent recovery if already active
      const token = await this.livekitService.generateParticipantToken({
        roomName: call.livekitRoomName,
        participantIdentity: userId,
        participantName:
          calleeParticipant.user.displayName || calleeParticipant.user.username,
        canPublish: true,
        canSubscribe: true,
      });
      return this.mapToCallResponseDto(call, token);
    }

    const now = new Date();

    // Atomic acceptance transaction
    const updatedCall = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.callSession.update({
        where: { id: callId },
        data: {
          status: CallStatus.ACTIVE,
          answeredAt: now,
        },
        include: callInclude,
      });

      await tx.callParticipant.update({
        where: { id: calleeParticipant.id },
        data: {
          status: CallParticipantStatus.ACCEPTED,
          joinedAt: now,
        },
      });

      return updated;
    });

    // Generate LiveKit token for callee
    const calleeToken = await this.livekitService.generateParticipantToken({
      roomName: updatedCall.livekitRoomName,
      participantIdentity: userId,
      participantName:
        calleeParticipant.user.displayName || calleeParticipant.user.username,
      canPublish: true,
      canSubscribe: true,
    });

    const responseDto = this.mapToCallResponseDto(updatedCall, calleeToken);

    // Emit call:accepted event to both caller and callee
    const payload: CallEventPayload = {
      callId: updatedCall.id,
      conversationId: updatedCall.conversationId,
      type: updatedCall.type,
      initiator: {
        id: updatedCall.initiator.id,
        username: updatedCall.initiator.username,
        displayName: updatedCall.initiator.displayName,
        avatarUrl: updatedCall.initiator.avatarUrl,
      },
      livekitRoomName: updatedCall.livekitRoomName,
      status: 'ACTIVE',
      answeredAt: now.toISOString(),
      createdAt: updatedCall.createdAt.toISOString(),
    };

    this.emitToUser(
      updatedCall.initiatorId,
      RealtimeEvents.CALL_ACCEPTED,
      payload,
    );
    this.emitToUser(userId, RealtimeEvents.CALL_ACCEPTED, payload);

    this.logger.log(`[call_accepted] callId=${callId} acceptedBy=${userId}`);

    return responseDto;
  }

  /**
   * Decline an incoming call (Callee only)
   */
  async declineCall(userId: string, callId: string): Promise<CallResponseDto> {
    this.clearRingTimer(callId);

    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
      include: callInclude,
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    if (call.status === CallStatus.ENDED) {
      return this.mapToCallResponseDto(call);
    }

    const now = new Date();

    const updatedCall = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.callSession.update({
        where: { id: callId },
        data: {
          status: CallStatus.ENDED,
          endReason: CallEndReason.DECLINED,
          endedByUserId: userId,
          endedAt: now,
        },
        include: callInclude,
      });

      await tx.callParticipant.updateMany({
        where: { callId, userId },
        data: {
          status: CallParticipantStatus.DECLINED,
          leftAt: now,
        },
      });

      return updated;
    });

    // Emit call:declined event to caller
    this.emitToUser(call.initiatorId, RealtimeEvents.CALL_DECLINED, {
      callId: call.id,
      conversationId: call.conversationId,
      type: call.type,
      initiator: {
        id: call.initiator.id,
        username: call.initiator.username,
        displayName: call.initiator.displayName,
        avatarUrl: call.initiator.avatarUrl,
      },
      livekitRoomName: call.livekitRoomName,
      status: 'ENDED',
      endReason: 'DECLINED',
      endedByUserId: userId,
      endedAt: now.toISOString(),
      createdAt: call.createdAt.toISOString(),
    });

    this.logger.log(`[call_declined] callId=${callId} declinedBy=${userId}`);

    return this.mapToCallResponseDto(updatedCall);
  }

  /**
   * Cancel an outgoing call before callee answers (Initiator only)
   */
  async cancelCall(userId: string, callId: string): Promise<CallResponseDto> {
    this.clearRingTimer(callId);

    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
      include: callInclude,
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    if (call.initiatorId !== userId) {
      throw new ForbiddenException('Only the initiator can cancel the call');
    }

    if (call.status === CallStatus.ENDED) {
      return this.mapToCallResponseDto(call);
    }

    const now = new Date();

    const updatedCall = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.callSession.update({
        where: { id: callId },
        data: {
          status: CallStatus.ENDED,
          endReason: CallEndReason.CANCELLED,
          endedByUserId: userId,
          endedAt: now,
        },
        include: callInclude,
      });

      await tx.callParticipant.updateMany({
        where: { callId },
        data: {
          leftAt: now,
        },
      });

      return updated;
    });

    // Emit call:cancelled event to other participants
    call.participants
      .filter((p) => p.userId !== userId)
      .forEach((p) => {
        this.emitToUser(p.userId, RealtimeEvents.CALL_CANCELLED, {
          callId: call.id,
          conversationId: call.conversationId,
          type: call.type,
          initiator: {
            id: call.initiator.id,
            username: call.initiator.username,
            displayName: call.initiator.displayName,
            avatarUrl: call.initiator.avatarUrl,
          },
          livekitRoomName: call.livekitRoomName,
          status: 'ENDED',
          endReason: 'CANCELLED',
          endedByUserId: userId,
          endedAt: now.toISOString(),
          createdAt: call.createdAt.toISOString(),
        });
      });

    this.logger.log(`[call_cancelled] callId=${callId} cancelledBy=${userId}`);

    return this.mapToCallResponseDto(updatedCall);
  }

  /**
   * End an active call (Any participant)
   */
  async endCall(userId: string, callId: string): Promise<CallResponseDto> {
    this.clearRingTimer(callId);

    const call = await this.prisma.callSession.findUnique({
      where: { id: callId },
      include: callInclude,
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const isParticipant = call.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this call');
    }

    if (call.status === CallStatus.ENDED) {
      return this.mapToCallResponseDto(call);
    }

    const now = new Date();
    const durationSeconds = call.answeredAt
      ? Math.max(
          0,
          Math.round((now.getTime() - call.answeredAt.getTime()) / 1000),
        )
      : 0;

    const updatedCall = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.callSession.update({
        where: { id: callId },
        data: {
          status: CallStatus.ENDED,
          endReason:
            call.status === CallStatus.ACTIVE
              ? CallEndReason.COMPLETED
              : CallEndReason.CANCELLED,
          endedByUserId: userId,
          endedAt: now,
          durationSeconds,
        },
        include: callInclude,
      });

      await tx.callParticipant.updateMany({
        where: { callId },
        data: {
          leftAt: now,
        },
      });

      return updated;
    });

    // Emit call:ended event to all participants
    call.participants.forEach((p) => {
      this.emitToUser(p.userId, RealtimeEvents.CALL_ENDED, {
        callId: call.id,
        conversationId: call.conversationId,
        type: call.type,
        initiator: {
          id: call.initiator.id,
          username: call.initiator.username,
          displayName: call.initiator.displayName,
          avatarUrl: call.initiator.avatarUrl,
        },
        livekitRoomName: call.livekitRoomName,
        status: 'ENDED',
        endReason: updatedCall.endReason || 'COMPLETED',
        endedByUserId: userId,
        durationSeconds,
        endedAt: now.toISOString(),
        createdAt: call.createdAt.toISOString(),
      });
    });

    this.logger.log(
      `[call_ended] callId=${callId} endedBy=${userId} duration=${durationSeconds}s`,
    );

    return this.mapToCallResponseDto(updatedCall);
  }

  /**
   * Get cursor-paginated call history
   */
  async getCallHistory(
    userId: string,
    query: CallHistoryQueryDto,
  ): Promise<{ calls: CallResponseDto[]; nextCursor: string | null }> {
    const limit = Math.min(50, Math.max(1, query.limit || 20));

    const where: Prisma.CallSessionWhereInput = {
      participants: {
        some: { userId },
      },
      ...(query.conversationId && { conversationId: query.conversationId }),
    };

    let cursorObj: Prisma.CallSessionWhereUniqueInput | undefined;
    if (query.cursor) {
      cursorObj = { id: query.cursor };
    }

    const calls = await this.prisma.callSession.findMany({
      where,
      include: callInclude,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursorObj && {
        cursor: cursorObj,
        skip: 1,
      }),
    });

    let nextCursor: string | null = null;
    if (calls.length > limit) {
      const nextItem = calls.pop();
      nextCursor = nextItem?.id || null;
    }

    return {
      calls: calls.map((c) => this.mapToCallResponseDto(c)),
      nextCursor,
    };
  }

  /**
   * Periodic reconciliation cron for stale calls (> 45s ringing without answer)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async reconcileStaleCalls(): Promise<void> {
    const cutoff = new Date(Date.now() - 45 * 1000);

    const staleCalls = await this.prisma.callSession.findMany({
      where: {
        status: CallStatus.RINGING,
        createdAt: { lt: cutoff },
      },
      include: callInclude,
      take: 20,
    });

    for (const call of staleCalls) {
      try {
        await this.handleMissedCall(call);
      } catch (err) {
        this.logger.error(`Error reconciling stale call ${call.id}`, err);
      }
    }
  }

  /**
   * Handle server-side ring timeout (30 seconds)
   */
  private scheduleRingTimeout(callId: string): void {
    const timer = setTimeout(() => {
      this.ringTimers.delete(callId);
      void (async () => {
        try {
          const call = await this.prisma.callSession.findUnique({
            where: { id: callId },
            include: callInclude,
          });

          if (call && call.status === CallStatus.RINGING) {
            await this.handleMissedCall(call);
          }
        } catch (err) {
          this.logger.error(
            `Error executing ring timeout for call ${callId}`,
            err,
          );
        }
      })();
    }, 30 * 1000);

    this.ringTimers.set(callId, timer);
  }

  private clearRingTimer(callId: string): void {
    const timer = this.ringTimers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.ringTimers.delete(callId);
    }
  }

  private async handleMissedCall(call: CallRecord): Promise<void> {
    const now = new Date();

    const callee = call.participants.find((p) => p.userId !== call.initiatorId);

    await this.prisma.$transaction(async (tx) => {
      await tx.callSession.update({
        where: { id: call.id },
        data: {
          status: CallStatus.ENDED,
          endReason: CallEndReason.NO_ANSWER,
          endedAt: now,
        },
      });

      await tx.callParticipant.updateMany({
        where: { callId: call.id, status: CallParticipantStatus.RINGING },
        data: {
          status: CallParticipantStatus.MISSED,
          leftAt: now,
        },
      });

      // Create missed call notification for callee
      if (callee) {
        await tx.notification.create({
          data: {
            recipientId: callee.userId,
            actorId: call.initiatorId,
            type: NotificationType.MISSED_CALL,
            entityId: call.id,
            entityType: 'CALL',
          },
        });
      }
    });

    const timeoutPayload: CallEventPayload = {
      callId: call.id,
      conversationId: call.conversationId,
      type: call.type,
      initiator: {
        id: call.initiator.id,
        username: call.initiator.username,
        displayName: call.initiator.displayName,
        avatarUrl: call.initiator.avatarUrl,
      },
      livekitRoomName: call.livekitRoomName,
      status: 'ENDED',
      endReason: 'NO_ANSWER',
      endedAt: now.toISOString(),
      createdAt: call.createdAt.toISOString(),
    };

    // Emit timeout event to both participants
    call.participants.forEach((p) => {
      this.emitToUser(p.userId, RealtimeEvents.CALL_TIMEOUT, timeoutPayload);
    });

    this.logger.log(`[call_timed_out] callId=${call.id} reason=NO_ANSWER`);
  }

  private emitToUser(userId: string, event: string, payload: any): void {
    try {
      if (this.chatGateway && this.chatGateway.server) {
        this.chatGateway.server.to(`user:${userId}`).emit(event, payload);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to emit ${event} to user:${userId}: ${(err as Error).message}`,
      );
    }
  }

  private mapToCallResponseDto(
    call: CallRecord,
    livekitToken?: { serverUrl: string; participantToken: string },
  ): CallResponseDto {
    return {
      id: call.id,
      conversationId: call.conversationId,
      initiatorId: call.initiatorId,
      initiator: {
        id: call.initiator.id,
        username: call.initiator.username,
        displayName: call.initiator.displayName,
        avatarUrl: call.initiator.avatarUrl,
      },
      type: call.type,
      status: call.status,
      livekitRoomName: call.livekitRoomName,
      ringingAt: call.ringingAt ? call.ringingAt.toISOString() : null,
      answeredAt: call.answeredAt ? call.answeredAt.toISOString() : null,
      endedAt: call.endedAt ? call.endedAt.toISOString() : null,
      durationSeconds: call.durationSeconds,
      endedByUserId: call.endedByUserId,
      endReason: call.endReason,
      participants: call.participants.map((p) => ({
        userId: p.userId,
        username: p.user.username,
        displayName: p.user.displayName,
        avatarUrl: p.user.avatarUrl,
        status: p.status,
        invitedAt: p.invitedAt.toISOString(),
        joinedAt: p.joinedAt ? p.joinedAt.toISOString() : null,
        leftAt: p.leftAt ? p.leftAt.toISOString() : null,
      })),
      livekit: livekitToken
        ? {
            serverUrl: livekitToken.serverUrl,
            participantToken: livekitToken.participantToken,
          }
        : undefined,
      createdAt: call.createdAt.toISOString(),
      updatedAt: call.updatedAt.toISOString(),
    };
  }
}
