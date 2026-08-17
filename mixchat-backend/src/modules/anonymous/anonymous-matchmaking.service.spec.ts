/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AnonymousMatchmakingService } from './anonymous-matchmaking.service';
import { AnonymousMatchmakingStore } from './anonymous-matchmaking.store';
import { SocialPolicyService } from '../social/social-policy.service';

describe('AnonymousMatchmakingService', () => {
  let service: AnonymousMatchmakingService;
  let store: jest.Mocked<AnonymousMatchmakingStore>;
  let socialPolicy: jest.Mocked<SocialPolicyService>;

  beforeEach(async () => {
    const mockStore = {
      getUserActiveSessionId: jest.fn(),
      enqueueUser: jest.fn(),
      dequeueUser: jest.fn(),
      getUserQueueState: jest.fn(),
      getOldestCandidates: jest.fn(),
      isRecentMatch: jest.fn(),
      createSession: jest.fn(),
      getSession: jest.fn(),
      endSession: jest.fn(),
    };

    const mockSocialPolicy = {
      isBlockedEitherDirection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnonymousMatchmakingService,
        { provide: AnonymousMatchmakingStore, useValue: mockStore },
        { provide: SocialPolicyService, useValue: mockSocialPolicy },
      ],
    }).compile();

    service = module.get<AnonymousMatchmakingService>(
      AnonymousMatchmakingService,
    );
    store = module.get(AnonymousMatchmakingStore);
    socialPolicy = module.get(SocialPolicyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should prevent self-matching', async () => {
    store.getUserActiveSessionId.mockResolvedValue(null);
    store.getOldestCandidates.mockResolvedValue(['user_1']);
    store.isRecentMatch.mockResolvedValue(false);
    socialPolicy.isBlockedEitherDirection.mockResolvedValue({
      blockedByA: false,
      blockedByB: false,
      isBlocked: false,
    });

    const match = await service.findAndCreateMatch('user_1', ['Tech']);
    expect(match).toBeNull();
    expect(store.createSession).not.toHaveBeenCalled();
  });

  it('should enforce bidirectional block rules', async () => {
    store.getUserActiveSessionId.mockResolvedValue(null);
    store.getOldestCandidates.mockResolvedValue(['user_blocked']);
    store.isRecentMatch.mockResolvedValue(false);
    socialPolicy.isBlockedEitherDirection.mockResolvedValue({
      blockedByA: true,
      blockedByB: false,
      isBlocked: true,
    });

    const match = await service.findAndCreateMatch('user_1', ['Tech']);
    expect(match).toBeNull();
    expect(store.createSession).not.toHaveBeenCalled();
  });

  it('should match users with common interests within 10s window', async () => {
    store.getUserActiveSessionId.mockResolvedValue(null);
    store.getOldestCandidates.mockImplementation((interest) => {
      if (interest === 'gaming') return Promise.resolve(['user_gamer']);
      return Promise.resolve(['user_gamer']);
    });
    store.isRecentMatch.mockResolvedValue(false);
    socialPolicy.isBlockedEitherDirection.mockResolvedValue({
      blockedByA: false,
      blockedByB: false,
      isBlocked: false,
    });
    store.getUserQueueState.mockResolvedValue({
      userId: 'user_gamer',
      joinedAt: Date.now() - 3000, // 3s wait
      interests: ['Gaming', 'Music'],
    });
    store.createSession.mockResolvedValue(true);

    const match = await service.findAndCreateMatch('user_1', ['Gaming']);
    expect(match).not.toBeNull();
    expect(match?.participantA.userId).toBe('user_1');
    expect(match?.participantB.userId).toBe('user_gamer');
    expect(match?.matchedInterests).toContain('Gaming');
    expect(store.createSession).toHaveBeenCalled();
  });

  it('should apply progressive relaxation for users waiting over 30s', async () => {
    store.getUserActiveSessionId.mockResolvedValue(null);
    store.getOldestCandidates.mockResolvedValue(['user_patient']);
    store.isRecentMatch.mockResolvedValue(false);
    socialPolicy.isBlockedEitherDirection.mockResolvedValue({
      blockedByA: false,
      blockedByB: false,
      isBlocked: false,
    });
    store.getUserQueueState.mockResolvedValue({
      userId: 'user_patient',
      joinedAt: Date.now() - 35000, // 35s wait (relaxed)
      interests: ['Books'],
    });
    store.createSession.mockResolvedValue(true);

    const match = await service.findAndCreateMatch('user_1', ['Sports']);
    expect(match).not.toBeNull();
    expect(match?.participantA.userId).toBe('user_1');
    expect(match?.participantB.userId).toBe('user_patient');
  });

  it('should avoid recently matched partners', async () => {
    store.getUserActiveSessionId.mockResolvedValue(null);
    store.getOldestCandidates.mockResolvedValue(['user_recent']);
    store.isRecentMatch.mockResolvedValue(true); // Is recent match
    socialPolicy.isBlockedEitherDirection.mockResolvedValue({
      blockedByA: false,
      blockedByB: false,
      isBlocked: false,
    });

    const match = await service.findAndCreateMatch('user_1', ['Tech']);
    expect(match).toBeNull();
    expect(store.createSession).not.toHaveBeenCalled();
  });
});
