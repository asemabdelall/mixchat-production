import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  AnonymousMatchmakingStore,
  StoredAnonymousSession,
} from './anonymous-matchmaking.store';
import { AnonymousPersonaGenerator } from './anonymous-persona.generator';
import { SocialPolicyService } from '../social/social-policy.service';

@Injectable()
export class AnonymousMatchmakingService {
  private readonly logger = new Logger(AnonymousMatchmakingService.name);

  constructor(
    private readonly store: AnonymousMatchmakingStore,
    private readonly socialPolicy: SocialPolicyService,
  ) {}

  /**
   * Joins the matchmaking queue and attempts an immediate atomic match.
   */
  async joinQueue(
    userId: string,
    interests: string[] = [],
  ): Promise<{
    status: 'SEARCHING' | 'MATCHED';
    session?: StoredAnonymousSession;
    joinedAt?: string;
    interests?: string[];
  }> {
    // 1. Check if user already has an active session
    const activeSessionId = await this.store.getUserActiveSessionId(userId);
    if (activeSessionId) {
      const existingSession = await this.store.getSession(activeSessionId);
      if (existingSession && existingSession.status !== 'ENDED') {
        return { status: 'MATCHED', session: existingSession };
      }
    }

    // 2. Normalize and sanitize interests
    const cleanInterests = Array.from(
      new Set(
        interests
          .map((i) => i.trim())
          .filter((i) => i.length > 0 && i.length <= 30),
      ),
    ).slice(0, 5);

    // 3. Atomically enqueue user
    const entry = await this.store.enqueueUser(userId, cleanInterests);

    // 4. Attempt immediate atomic match
    const matchedSession = await this.findAndCreateMatch(
      userId,
      cleanInterests,
    );
    if (matchedSession) {
      this.logger.log(
        `[Matchmaking] Immediate match created for user ${userId} -> session ${matchedSession.id}`,
      );
      return { status: 'MATCHED', session: matchedSession };
    }

    return {
      status: 'SEARCHING',
      joinedAt: new Date(entry.joinedAt).toISOString(),
      interests: cleanInterests,
    };
  }

  /**
   * Removes user from matchmaking queue idempotently.
   */
  async leaveQueue(userId: string): Promise<void> {
    await this.store.dequeueUser(userId);
    this.logger.log(`[Matchmaking] User ${userId} left queue`);
  }

  /**
   * Retrieves user's current matchmaking status.
   */
  async getStatus(userId: string): Promise<{
    status: 'IDLE' | 'SEARCHING' | 'MATCHED';
    session?: StoredAnonymousSession;
    joinedAt?: string;
    interests?: string[];
  }> {
    // 1. Check active session
    const activeSessionId = await this.store.getUserActiveSessionId(userId);
    if (activeSessionId) {
      const session = await this.store.getSession(activeSessionId);
      if (session && session.status !== 'ENDED') {
        return { status: 'MATCHED', session };
      }
    }

    // 2. Check queue state
    const queueState = await this.store.getUserQueueState(userId);
    if (queueState) {
      return {
        status: 'SEARCHING',
        joinedAt: new Date(queueState.joinedAt).toISOString(),
        interests: queueState.interests,
      };
    }

    return { status: 'IDLE' };
  }

  /**
   * Core Matchmaking Engine:
   * Evaluates oldest queue candidates, checks bidirectional block rules,
   * applies progressive wait-time relaxation, and creates atomic session.
   */
  async findAndCreateMatch(
    userId: string,
    interests: string[] = [],
  ): Promise<StoredAnonymousSession | null> {
    const candidateSet = new Set<string>();

    // 1. Collect candidates from interest queues
    for (const interest of interests) {
      const candidates = await this.store.getOldestCandidates(interest, 20);
      candidates.forEach((c) => candidateSet.add(c));
    }

    // 2. Collect candidates from global FIFO queue
    const globalCandidates = await this.store.getOldestCandidates(
      undefined,
      30,
    );
    globalCandidates.forEach((c) => candidateSet.add(c));

    const candidateList = Array.from(candidateSet);
    const now = Date.now();

    for (const candidateId of candidateList) {
      // Rule 1: No self-matching
      if (candidateId === userId) continue;

      // Rule 2: Candidate must not already have an active match
      const candidateActiveSession =
        await this.store.getUserActiveSessionId(candidateId);
      if (candidateActiveSession) continue;

      // Rule 3: Avoid recently matched pairs (15m TTL)
      const isRecent = await this.store.isRecentMatch(userId, candidateId);
      if (isRecent) continue;

      // Rule 4: Safety / Block enforcement (bidirectional)
      const blockResult = await this.socialPolicy.isBlockedEitherDirection(
        userId,
        candidateId,
      );
      if (blockResult.isBlocked) continue;

      // Rule 5: Verify candidate is still actively in queue
      const candidateState = await this.store.getUserQueueState(candidateId);
      if (!candidateState) {
        // Stale entry cleanup
        await this.store.dequeueUser(candidateId);
        continue;
      }

      // Rule 6: Interest overlap & Progressive wait-time relaxation
      const candidateInterests = candidateState.interests || [];
      const commonInterests = interests.filter((i) =>
        candidateInterests.some((ci) => ci.toLowerCase() === i.toLowerCase()),
      );

      const candidateWaitDurationMs = now - candidateState.joinedAt;
      let isCompatible = false;

      if (candidateWaitDurationMs < 10000) {
        // 0-10s: Strict interest matching or both Random/No-interest
        isCompatible =
          commonInterests.length > 0 ||
          (interests.length === 0 && candidateInterests.length === 0);
      } else if (candidateWaitDurationMs < 30000) {
        // 10-30s: Partial interest matching or one party in Random mode
        isCompatible =
          commonInterests.length > 0 ||
          interests.length === 0 ||
          candidateInterests.length === 0;
      } else {
        // 30s+: Progressive relaxation allows broader pool match
        isCompatible = true;
      }

      if (isCompatible) {
        // Generate temporary opaque personas
        const personaA = AnonymousPersonaGenerator.generate();
        const personaB = AnonymousPersonaGenerator.generate(
          personaA.displayName,
        );

        const sessionId = `anon_sess_${randomBytes(8).toString('hex')}`;
        const startedAt = new Date(now).toISOString();
        const expiresAt = new Date(now + 3600 * 1000).toISOString();

        const session: StoredAnonymousSession = {
          id: sessionId,
          status: 'ACTIVE',
          participantA: {
            userId,
            persona: personaA,
            revealConsent: false,
          },
          participantB: {
            userId: candidateId,
            persona: personaB,
            revealConsent: false,
          },
          matchedInterests:
            commonInterests.length > 0
              ? commonInterests
              : interests.length > 0
                ? interests
                : candidateInterests.length > 0
                  ? candidateInterests
                  : ['General Talk'],
          messages: [],
          startedAt,
          expiresAt,
        };

        const success = await this.store.createSession(session);
        if (success) {
          return session;
        }
      }
    }

    return null;
  }
}
