import { Test, TestingModule } from '@nestjs/testing';
import { CallsService } from './calls.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { LiveKitService } from './livekit.service';
import { WebPushService } from '../notifications/web-push.service';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { ChatGateway } from '../chat/realtime/chat.gateway';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import {
  CallStatus,
  CallType,
  CallEndReason,
  CallParticipantStatus,
} from '@prisma/client';

describe('CallsService', () => {
  let service: CallsService;
  let prisma: any;
  let livekitService: any;
  let webPushService: any;
  let rateLimit: any;
  let chatGateway: any;

  const callerId = 'user-caller-123';
  const calleeId = 'user-callee-456';
  const conversationId = 'conv-123';
  const callId = 'call-uuid-789';

  const mockConversation = {
    id: conversationId,
    participants: [
      {
        userId: callerId,
        leftAt: null,
        user: {
          id: callerId,
          username: 'caller',
          displayName: 'Caller User',
          avatarUrl: 'https://example.com/caller.jpg',
          status: 'ACTIVE',
        },
      },
      {
        userId: calleeId,
        leftAt: null,
        user: {
          id: calleeId,
          username: 'callee',
          displayName: 'Callee User',
          avatarUrl: 'https://example.com/callee.jpg',
          status: 'ACTIVE',
        },
      },
    ],
  };

  const mockCallSession = {
    id: callId,
    conversationId,
    initiatorId: callerId,
    type: CallType.VOICE,
    status: CallStatus.RINGING,
    livekitRoomName: 'mixchat-call-mock-room',
    ringingAt: new Date(),
    answeredAt: null,
    endedAt: null,
    durationSeconds: 0,
    endedByUserId: null,
    endReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    initiator: {
      id: callerId,
      username: 'caller',
      displayName: 'Caller User',
      avatarUrl: 'https://example.com/caller.jpg',
    },
    participants: [
      {
        id: 'cp-1',
        callId,
        userId: callerId,
        status: CallParticipantStatus.RINGING,
        invitedAt: new Date(),
        joinedAt: null,
        leftAt: null,
        user: {
          id: callerId,
          username: 'caller',
          displayName: 'Caller User',
          avatarUrl: 'https://example.com/caller.jpg',
        },
      },
      {
        id: 'cp-2',
        callId,
        userId: calleeId,
        status: CallParticipantStatus.RINGING,
        invitedAt: new Date(),
        joinedAt: null,
        leftAt: null,
        user: {
          id: calleeId,
          username: 'callee',
          displayName: 'Callee User',
          avatarUrl: 'https://example.com/callee.jpg',
        },
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue(mockConversation),
      },
      block: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      callSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(mockCallSession),
        findMany: jest.fn().mockResolvedValue([mockCallSession]),
        create: jest.fn().mockResolvedValue(mockCallSession),
        update: jest.fn().mockResolvedValue({
          ...mockCallSession,
          status: CallStatus.ACTIVE,
          answeredAt: new Date(),
        }),
      },
      callParticipant: {
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    livekitService = {
      isConfigured: jest.fn().mockReturnValue(true),
      generateParticipantToken: jest.fn().mockResolvedValue({
        serverUrl: 'wss://livekit.example.com',
        participantToken: 'mock.livekit.token',
      }),
    };

    webPushService = {
      sendIncomingCallPush: jest.fn().mockResolvedValue(undefined),
    };

    rateLimit = {
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
    };

    chatGateway = {
      server: {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallsService,
        { provide: PrismaService, useValue: prisma },
        { provide: LiveKitService, useValue: livekitService },
        { provide: WebPushService, useValue: webPushService },
        { provide: RateLimitService, useValue: rateLimit },
        { provide: ChatGateway, useValue: chatGateway },
      ],
    }).compile();

    service = module.get<CallsService>(CallsService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('initiateCall', () => {
    it('should successfully initiate a 1-to-1 voice call and generate LiveKit token', async () => {
      const result = await service.initiateCall(callerId, {
        conversationId,
        type: CallType.VOICE,
      });

      expect(result.id).toBe(callId);
      expect(result.type).toBe(CallType.VOICE);
      expect(result.status).toBe(CallStatus.RINGING);
      expect(result.livekit?.participantToken).toBe('mock.livekit.token');
      expect(livekitService.generateParticipantToken).toHaveBeenCalled();
      expect(webPushService.sendIncomingCallPush).toHaveBeenCalledWith(
        calleeId,
        expect.objectContaining({ id: callId, type: 'VOICE' }),
      );
    });

    it('should throw ForbiddenException if user is blocked', async () => {
      prisma.block.findFirst.mockResolvedValueOnce({ id: 'block-1' });

      await expect(
        service.initiateCall(callerId, {
          conversationId,
          type: CallType.VOICE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if callee is already in another call (BUSY)', async () => {
      prisma.callSession.findFirst
        .mockResolvedValueOnce(null) // caller is free
        .mockResolvedValueOnce({ id: 'existing-call' }); // callee is busy

      await expect(
        service.initiateCall(callerId, {
          conversationId,
          type: CallType.VOICE,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('acceptCall', () => {
    it('should atomically accept call and return LiveKit connection credentials', async () => {
      const result = await service.acceptCall(calleeId, callId);

      expect(result.status).toBe(CallStatus.ACTIVE);
      expect(result.livekit?.participantToken).toBe('mock.livekit.token');
      expect(livekitService.generateParticipantToken).toHaveBeenCalled();
    });

    it('should reject if caller attempts to accept own call', async () => {
      await expect(service.acceptCall(callerId, callId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('declineCall', () => {
    it('should decline call and transition to ENDED with DECLINED reason', async () => {
      prisma.callSession.update.mockResolvedValueOnce({
        ...mockCallSession,
        status: CallStatus.ENDED,
        endReason: CallEndReason.DECLINED,
        endedByUserId: calleeId,
      });

      const result = await service.declineCall(calleeId, callId);
      expect(result.status).toBe(CallStatus.ENDED);
      expect(result.endReason).toBe(CallEndReason.DECLINED);
    });
  });

  describe('cancelCall', () => {
    it('should cancel call by initiator', async () => {
      prisma.callSession.update.mockResolvedValueOnce({
        ...mockCallSession,
        status: CallStatus.ENDED,
        endReason: CallEndReason.CANCELLED,
        endedByUserId: callerId,
      });

      const result = await service.cancelCall(callerId, callId);
      expect(result.status).toBe(CallStatus.ENDED);
      expect(result.endReason).toBe(CallEndReason.CANCELLED);
    });

    it('should throw ForbiddenException if non-initiator tries to cancel', async () => {
      await expect(service.cancelCall(calleeId, callId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('endCall', () => {
    it('should end active call and compute duration', async () => {
      prisma.callSession.findUnique.mockResolvedValueOnce({
        ...mockCallSession,
        status: CallStatus.ACTIVE,
        answeredAt: new Date(Date.now() - 60000), // 60s ago
      });

      prisma.callSession.update.mockResolvedValueOnce({
        ...mockCallSession,
        status: CallStatus.ENDED,
        endReason: CallEndReason.COMPLETED,
        durationSeconds: 60,
      });

      const result = await service.endCall(callerId, callId);
      expect(result.status).toBe(CallStatus.ENDED);
      expect(result.durationSeconds).toBe(60);
    });
  });

  describe('getCallHistory', () => {
    it('should return paginated call history', async () => {
      const history = await service.getCallHistory(callerId, { limit: 10 });
      expect(history.calls.length).toBe(1);
      expect(history.calls[0].id).toBe(callId);
    });
  });
});
