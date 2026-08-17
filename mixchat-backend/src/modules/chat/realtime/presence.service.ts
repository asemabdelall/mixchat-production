import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface PresenceState {
  status: 'ONLINE' | 'OFFLINE';
  lastSeen: string | null;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly PRESENCE_PREFIX = 'mixchat:presence';
  private readonly SOCKETS_PREFIX = 'mixchat:presence:sockets';
  private readonly USER_PRESENCE_TTL_SECONDS = 86400; // 24 hours

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Register a new socket connection for a user.
   * If user was previously offline (0 active sockets), transitions them to ONLINE.
   */
  async registerSocketConnection(
    userId: string,
    socketId: string,
  ): Promise<{ transitioned: boolean; status: 'ONLINE' | 'OFFLINE' }> {
    const socketsKey = `${this.SOCKETS_PREFIX}:${userId}`;
    const userPresenceKey = `${this.PRESENCE_PREFIX}:${userId}`;

    try {
      const client = this.redisService.getClient();
      // Add socket to user socket set
      await client.sadd(socketsKey, socketId);
      await client.expire(socketsKey, this.USER_PRESENCE_TTL_SECONDS);

      const count = await client.scard(socketsKey);
      const currentPresence = await client.get(userPresenceKey);

      if (count === 1 || currentPresence !== 'ONLINE') {
        await client.set(
          userPresenceKey,
          'ONLINE',
          'EX',
          this.USER_PRESENCE_TTL_SECONDS,
        );
        this.logger.debug(
          `User ${userId} transitioned to ONLINE (active sockets: ${count})`,
        );
        return { transitioned: true, status: 'ONLINE' };
      }

      return { transitioned: false, status: 'ONLINE' };
    } catch (error) {
      this.logger.warn(
        `Failed to register socket presence for user ${userId}: ${(error as Error).message}`,
      );
      return { transitioned: false, status: 'ONLINE' };
    }
  }

  /**
   * Unregister a disconnected socket.
   * If 0 active sockets remain, transitions user to OFFLINE and updates durable lastSeen in PostgreSQL.
   */
  async unregisterSocketConnection(
    userId: string,
    socketId: string,
  ): Promise<{
    transitioned: boolean;
    status: 'ONLINE' | 'OFFLINE';
    lastSeen: string;
  }> {
    const socketsKey = `${this.SOCKETS_PREFIX}:${userId}`;
    const userPresenceKey = `${this.PRESENCE_PREFIX}:${userId}`;
    const nowIso = new Date().toISOString();

    try {
      const client = this.redisService.getClient();
      await client.srem(socketsKey, socketId);
      const remaining = await client.scard(socketsKey);

      if (remaining === 0) {
        await client.set(
          userPresenceKey,
          'OFFLINE',
          'EX',
          this.USER_PRESENCE_TTL_SECONDS,
        );

        // Update durable lastSeen in PostgreSQL without blocking
        this.prisma.user
          .update({
            where: { id: userId },
            data: { updatedAt: new Date() },
          })
          .catch((err) => {
            this.logger.warn(
              `Failed to update lastSeen for user ${userId}: ${err.message}`,
            );
          });

        this.logger.debug(`User ${userId} transitioned to OFFLINE`);
        return { transitioned: true, status: 'OFFLINE', lastSeen: nowIso };
      }

      return { transitioned: false, status: 'ONLINE', lastSeen: nowIso };
    } catch (error) {
      this.logger.warn(
        `Failed to unregister socket presence for user ${userId}: ${(error as Error).message}`,
      );
      return { transitioned: false, status: 'OFFLINE', lastSeen: nowIso };
    }
  }

  /**
   * Query batch presence status for requested user IDs.
   */
  async getPresence(userIds: string[]): Promise<Record<string, PresenceState>> {
    if (!userIds || userIds.length === 0) return {};
    const safeUserIds = [...new Set(userIds)].slice(0, 100);
    const result: Record<string, PresenceState> = {};

    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      safeUserIds.forEach((uid) => {
        pipeline.get(`${this.PRESENCE_PREFIX}:${uid}`);
      });

      const responses = await pipeline.exec();

      safeUserIds.forEach((uid, index) => {
        const res = responses ? responses[index] : null;
        const status = res && res[1] === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
        result[uid] = {
          status,
          lastSeen: null,
        };
      });

      return result;
    } catch (error) {
      this.logger.warn(
        `Failed to query presence batch: ${(error as Error).message}`,
      );
      safeUserIds.forEach((uid) => {
        result[uid] = { status: 'OFFLINE', lastSeen: null };
      });
      return result;
    }
  }
}
