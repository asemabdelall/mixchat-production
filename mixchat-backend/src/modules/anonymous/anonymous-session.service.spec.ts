/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AnonymousSessionService } from './anonymous-session.service';
import {
  AnonymousMatchmakingStore,
  StoredAnonymousSession,
} from './anonymous-matchmaking.store';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MediaService } from '../media/media.service';

describe('AnonymousSessionService', () => {
  let service: AnonymousSessionService;
  let store: jest.Mocked<AnonymousMatchmakingStore>;
  let prisma: jest.Mocked<PrismaService>;

  const mockActiveSession: StoredAnonymousSession = {
    id: 'anon_sess_test123',
    status: 'ACTIVE',
    participantA: {
      userId: 'user_alice',
      persona: {
        id: 'anon_p_alice',
        displayName: 'Anonymous Nova',
        avatar: 'https://cdn.test/avatar_a.svg',
        theme: 'from-purple-500 to-indigo-500',
      },
      revealConsent: false,
    },
    participantB: {
      userId: 'user_bob',
      persona: {
        id: 'anon_p_bob',
        displayName: 'Anonymous Echo',
        avatar: 'https://cdn.test/avatar_b.svg',
        theme: 'from-cyan-400 to-blue-600',
      },
      revealConsent: false,
    },
    matchedInterests: ['Technology'],
    messages: [],
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };

  beforeEach(async () => {
    const mockStore = {
      getSession: jest.fn(),
      saveSession: jest.fn(),
      endSession: jest.fn(),
    };

    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
      anonymousReport: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) =>
        cb({
          block: { upsert: jest.fn() },
          follow: { deleteMany: jest.fn() },
          followRequest: { deleteMany: jest.fn() },
        }),
      ),
    };

    const mockMediaService = {
      getMedia: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnonymousSessionService,
        { provide: AnonymousMatchmakingStore, useValue: mockStore },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();

    service = module.get<AnonymousSessionService>(AnonymousSessionService);
    store = module.get(AnonymousMatchmakingStore);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSessionDto & Privacy Invariant', () => {
    it('should NEVER leak real identity before mutual reveal', async () => {
      store.getSession.mockResolvedValue({ ...mockActiveSession });

      const dto = await service.getSessionDto(
        'anon_sess_test123',
        'user_alice',
      );

      expect(dto.id).toBe('anon_sess_test123');
      expect(dto.me.displayName).toBe('Anonymous Nova');
      expect(dto.partner?.displayName).toBe('Anonymous Echo');
      expect(dto.revealConsent.isMutual).toBe(false);
      expect(dto.revealedPartner).toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should reject third-party non-participant viewer (IDOR Protection)', async () => {
      store.getSession.mockResolvedValue({ ...mockActiveSession });

      await expect(
        service.getSessionDto('anon_sess_test123', 'user_eve_attacker'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should populate real public profile after mutual reveal', async () => {
      const revealedSession: StoredAnonymousSession = {
        ...mockActiveSession,
        status: 'REVEALED',
        participantA: {
          ...mockActiveSession.participantA,
          revealConsent: true,
        },
        participantB: {
          ...mockActiveSession.participantB,
          revealConsent: true,
        },
      };

      store.getSession.mockResolvedValue(revealedSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_bob',
        username: 'bob_dev',
        displayName: 'Bob Builder',
        avatarUrl: 'https://cdn.mixchat.com/bob.png',
        isVerified: true,
        isPremium: false,
        bio: 'Coding full stack',
      });

      const dto = await service.getSessionDto(
        'anon_sess_test123',
        'user_alice',
      );

      expect(dto.status).toBe('REVEALED');
      expect(dto.revealConsent.isMutual).toBe(true);
      expect(dto.revealedPartner).not.toBeNull();
      expect(dto.revealedPartner?.username).toBe('bob_dev');
      expect(dto.revealedPartner?.displayName).toBe('Bob Builder');
    });
  });

  describe('Mutual Reveal Handshake State Machine', () => {
    it('should maintain anonymity on one-sided reveal request', async () => {
      store.getSession.mockResolvedValue({ ...mockActiveSession });

      const result = await service.requestReveal(
        'anon_sess_test123',
        'user_alice',
      );

      expect(result.isMutual).toBe(false);
      expect(result.partnerUserId).toBe('user_bob');
      expect(store.saveSession).toHaveBeenCalled();
    });

    it('should transition to REVEALED when both participants consent', async () => {
      const userAAlreadyConsented: StoredAnonymousSession = {
        ...mockActiveSession,
        participantA: {
          ...mockActiveSession.participantA,
          revealConsent: true,
        },
      };
      store.getSession.mockResolvedValue(userAAlreadyConsented);

      const result = await service.requestReveal(
        'anon_sess_test123',
        'user_bob',
      );

      expect(result.isMutual).toBe(true);
      expect(result.session.status).toBe('REVEALED');
      expect(store.saveSession).toHaveBeenCalled();
    });
  });

  describe('Anonymous Block & Report', () => {
    it('should block partner and terminate session', async () => {
      store.getSession.mockResolvedValue({ ...mockActiveSession });

      const result = await service.blockPartner(
        'anon_sess_test123',
        'user_alice',
      );

      expect(result.partnerUserId).toBe('user_bob');
      expect(store.endSession).toHaveBeenCalledWith(
        'anon_sess_test123',
        'user_alice',
        'user_bob',
        'BLOCKED',
      );
    });

    it('should record durable AnonymousReport and terminate session', async () => {
      store.getSession.mockResolvedValue({ ...mockActiveSession });
      (prisma.anonymousReport.create as jest.Mock).mockResolvedValue({
        id: 'rep_12345',
      });

      const result = await service.reportPartner(
        'anon_sess_test123',
        'user_alice',
        'Harassment',
        'Sent offensive messages',
      );

      expect(result.reportId).toBe('rep_12345');
      expect(prisma.anonymousReport.create).toHaveBeenCalled();
      expect(store.endSession).toHaveBeenCalledWith(
        'anon_sess_test123',
        'user_alice',
        'user_bob',
        'REPORTED',
      );
    });
  });
});
