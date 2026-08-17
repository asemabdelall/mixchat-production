import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';

@Injectable()
export class TypingService {
  private readonly logger = new Logger(TypingService.name);
  private readonly TYPING_PREFIX = 'mixchat:typing';
  private readonly TYPING_TTL_SECONDS = 4; // 4 seconds automatic expiry

  constructor(private readonly redisService: RedisService) {}

  /**
   * Set ephemeral typing state in Redis with auto-expiry.
   */
  async startTyping(conversationId: string, userId: string): Promise<boolean> {
    const key = `${this.TYPING_PREFIX}:${conversationId}:${userId}`;
    try {
      const client = this.redisService.getClient();
      // Set with 4 second TTL
      await client.set(key, '1', 'EX', this.TYPING_TTL_SECONDS);
      return true;
    } catch (error) {
      this.logger.warn(
        `Failed to set typing state: ${(error as Error).message}`,
      );
      return true;
    }
  }

  /**
   * Clear ephemeral typing state.
   */
  async stopTyping(conversationId: string, userId: string): Promise<void> {
    const key = `${this.TYPING_PREFIX}:${conversationId}:${userId}`;
    try {
      const client = this.redisService.getClient();
      await client.del(key);
    } catch (error) {
      this.logger.warn(
        `Failed to delete typing state: ${(error as Error).message}`,
      );
    }
  }
}
