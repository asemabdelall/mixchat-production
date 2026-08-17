import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { AnonymousPersona } from './anonymous-persona.generator';
import { AnonymousMessageType } from './dto/anonymous-session-actions.dto';

export interface StoredQueueEntry {
  userId: string;
  joinedAt: number; // Unix epoch ms
  interests: string[];
}

export interface StoredAnonymousMessage {
  id: string;
  sessionId: string;
  senderUserId: string; // Internal real userId, mapped to anonymousPersona before client emission
  senderPersonaId: string;
  type: AnonymousMessageType;
  content?: string;
  mediaUrl?: string;
  voiceDurationMs?: number;
  createdAt: string;
}

export interface StoredAnonymousSession {
  id: string;
  status: 'ACTIVE' | 'REVEALED' | 'ENDED';
  endReason?:
    'LEFT' | 'SKIPPED' | 'DISCONNECTED' | 'BLOCKED' | 'REPORTED' | 'EXPIRED';
  participantA: {
    userId: string;
    persona: AnonymousPersona;
    revealConsent: boolean;
  };
  participantB: {
    userId: string;
    persona: AnonymousPersona;
    revealConsent: boolean;
  };
  matchedInterests: string[];
  messages: StoredAnonymousMessage[];
  startedAt: string;
  expiresAt: string;
}

@Injectable()
export class AnonymousMatchmakingStore {
  private readonly logger = new Logger(AnonymousMatchmakingStore.name);

  // TTL Constants (in seconds)
  private readonly QUEUE_TTL_SEC = 600; // 10 minutes max queue wait
  private readonly SESSION_TTL_SEC = 3600; // 1 hour active session
  private readonly RECENT_MATCH_TTL_SEC = 900; // 15 minutes recent avoidance
  private readonly GRACE_TTL_SEC = 30; // 30 seconds disconnect grace

  constructor(private readonly redisService: RedisService) {}

  // Key naming conventions
  private keyGlobalQueue(): string {
    return 'mixchat:anonymous:queue:global';
  }

  private keyInterestQueue(interest: string): string {
    const sanitized = interest
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '');
    return `mixchat:anonymous:queue:interest:${sanitized}`;
  }

  private keyUserState(userId: string): string {
    return `mixchat:anonymous:user:${userId}`;
  }

  private keyActiveSession(sessionId: string): string {
    return `mixchat:anonymous:session:${sessionId}`;
  }

  private keyUserActiveSession(userId: string): string {
    return `mixchat:anonymous:active:${userId}`;
  }

  private keyRecentMatches(userId: string): string {
    return `mixchat:anonymous:recent:${userId}`;
  }

  private keyDisconnectGrace(userId: string): string {
    return `mixchat:anonymous:grace:${userId}`;
  }

  private keyTyping(sessionId: string, userId: string): string {
    return `mixchat:anonymous:typing:${sessionId}:${userId}`;
  }

  /**
   * Adds user to matchmaking queues and registers user searching state atomically.
   */
  async enqueueUser(
    userId: string,
    interests: string[],
  ): Promise<StoredQueueEntry> {
    const client = this.redisService.getClient();
    const joinedAt = Date.now();
    const entry: StoredQueueEntry = { userId, joinedAt, interests };

    const pipeline = client.pipeline();
    const staleBefore = joinedAt - this.QUEUE_TTL_SEC * 1000;

    // 1. Add to global FIFO queue with joinedAt score
    pipeline.zremrangebyscore(this.keyGlobalQueue(), 0, staleBefore);
    pipeline.zadd(this.keyGlobalQueue(), joinedAt, userId);
    pipeline.expire(this.keyGlobalQueue(), this.QUEUE_TTL_SEC * 2);

    // 2. Add to specific interest queues if provided
    interests.forEach((interest) => {
      const queueKey = this.keyInterestQueue(interest);
      pipeline.zremrangebyscore(queueKey, 0, staleBefore);
      pipeline.zadd(queueKey, joinedAt, userId);
      pipeline.expire(queueKey, this.QUEUE_TTL_SEC * 2);
    });

    // 3. Set user state with TTL
    pipeline.set(
      this.keyUserState(userId),
      JSON.stringify(entry),
      'EX',
      this.QUEUE_TTL_SEC,
    );

    await pipeline.exec();
    return entry;
  }

  /**
   * Removes user from all matchmaking queues atomically.
   */
  async dequeueUser(userId: string): Promise<void> {
    const client = this.redisService.getClient();
    const rawState = await client.get(this.keyUserState(userId));

    const pipeline = client.pipeline();
    pipeline.zrem(this.keyGlobalQueue(), userId);

    if (rawState) {
      try {
        const entry: StoredQueueEntry = JSON.parse(rawState);
        entry.interests?.forEach((interest) => {
          pipeline.zrem(this.keyInterestQueue(interest), userId);
        });
      } catch {
        // Safe JSON parse fallback
      }
    }

    pipeline.del(this.keyUserState(userId));
    await pipeline.exec();
  }

  /**
   * Retrieves user queue entry state.
   */
  async getUserQueueState(userId: string): Promise<StoredQueueEntry | null> {
    const client = this.redisService.getClient();
    const raw = await client.get(this.keyUserState(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Fetches top oldest candidate user IDs from specific interest queue or global queue.
   */
  async getOldestCandidates(
    interest?: string,
    limit: number = 30,
  ): Promise<string[]> {
    const client = this.redisService.getClient();
    const queueKey = interest
      ? this.keyInterestQueue(interest)
      : this.keyGlobalQueue();
    await client.zremrangebyscore(
      queueKey,
      0,
      Date.now() - this.QUEUE_TTL_SEC * 1000,
    );
    return (client as any).zrange(queueKey, 0, limit - 1) as Promise<string[]>;
  }

  /**
   * Atomically claims two users and creates an Anonymous Session.
   */
  async createSession(session: StoredAnonymousSession): Promise<boolean> {
    const client = this.redisService.getClient();
    const userA = session.participantA.userId;
    const userB = session.participantB.userId;

    const pipeline = client.pipeline();

    // 1. Remove both users from global queue
    pipeline.zrem(this.keyGlobalQueue(), userA, userB);

    // 2. Remove from interest queues
    session.matchedInterests.forEach((interest) => {
      pipeline.zrem(this.keyInterestQueue(interest), userA, userB);
    });

    // 3. Remove individual queue states
    pipeline.del(this.keyUserState(userA), this.keyUserState(userB));

    // 4. Save Session object with TTL
    pipeline.set(
      this.keyActiveSession(session.id),
      JSON.stringify(session),
      'EX',
      this.SESSION_TTL_SEC,
    );

    // 5. Map active session for both users
    pipeline.set(
      this.keyUserActiveSession(userA),
      session.id,
      'EX',
      this.SESSION_TTL_SEC,
    );
    pipeline.set(
      this.keyUserActiveSession(userB),
      session.id,
      'EX',
      this.SESSION_TTL_SEC,
    );

    // 6. Record recent matches to avoid immediate rematching
    pipeline.sadd(this.keyRecentMatches(userA), userB);
    pipeline.expire(this.keyRecentMatches(userA), this.RECENT_MATCH_TTL_SEC);
    pipeline.sadd(this.keyRecentMatches(userB), userA);
    pipeline.expire(this.keyRecentMatches(userB), this.RECENT_MATCH_TTL_SEC);

    const results = await pipeline.exec();
    return !results?.some(([err]) => err !== null);
  }

  /**
   * Retrieves active session by session ID.
   */
  async getSession(sessionId: string): Promise<StoredAnonymousSession | null> {
    const client = this.redisService.getClient();
    const raw = await client.get(this.keyActiveSession(sessionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Updates an existing stored session with TTL preservation.
   */
  async saveSession(session: StoredAnonymousSession): Promise<void> {
    const client = this.redisService.getClient();
    await client.set(
      this.keyActiveSession(session.id),
      JSON.stringify(session),
      'EX',
      this.SESSION_TTL_SEC,
    );
  }

  /**
   * Resolves the active session ID for a user.
   */
  async getUserActiveSessionId(userId: string): Promise<string | null> {
    const client = this.redisService.getClient();
    return client.get(this.keyUserActiveSession(userId));
  }

  /**
   * Cleans up an active session when ended or skipped.
   */
  async endSession(
    sessionId: string,
    userAId: string,
    userBId: string,
    endReason: StoredAnonymousSession['endReason'],
  ): Promise<void> {
    const client = this.redisService.getClient();
    const session = await this.getSession(sessionId);

    const pipeline = client.pipeline();
    pipeline.del(this.keyUserActiveSession(userAId));
    pipeline.del(this.keyUserActiveSession(userBId));

    if (session) {
      session.status = 'ENDED';
      session.endReason = endReason;
      // Retain briefly (120s) for graceful UI transition / disconnect messages
      pipeline.set(
        this.keyActiveSession(sessionId),
        JSON.stringify(session),
        'EX',
        120,
      );
    } else {
      pipeline.del(this.keyActiveSession(sessionId));
    }

    await pipeline.exec();
  }

  /**
   * Checks if user B is in user A's recent matches.
   */
  async isRecentMatch(userAId: string, userBId: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const isMember = await client.sismember(
      this.keyRecentMatches(userAId),
      userBId,
    );
    return isMember === 1;
  }

  /**
   * Sets disconnect grace period key for user.
   */
  async setDisconnectGrace(userId: string, sessionId: string): Promise<void> {
    const client = this.redisService.getClient();
    await client.set(
      this.keyDisconnectGrace(userId),
      sessionId,
      'EX',
      this.GRACE_TTL_SEC,
    );
  }

  /**
   * Clears disconnect grace period key.
   */
  async clearDisconnectGrace(userId: string): Promise<void> {
    const client = this.redisService.getClient();
    await client.del(this.keyDisconnectGrace(userId));
  }

  /**
   * Checks if user is currently in disconnect grace period.
   */
  async getDisconnectGrace(userId: string): Promise<string | null> {
    const client = this.redisService.getClient();
    return client.get(this.keyDisconnectGrace(userId));
  }

  /**
   * Sets temporary typing flag.
   */
  async setTyping(
    sessionId: string,
    userId: string,
    isTyping: boolean,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const key = this.keyTyping(sessionId, userId);
    if (isTyping) {
      await client.set(key, '1', 'EX', 5);
    } else {
      await client.del(key);
    }
  }
}
