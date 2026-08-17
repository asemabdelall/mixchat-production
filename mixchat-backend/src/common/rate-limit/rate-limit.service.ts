import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/redis/redis.service';

export interface RateLimitOptions {
  action: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    private readonly redis: RedisService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  private keyPrefix(): string {
    const environment = this.config?.get<string>('nodeEnv') || 'development';
    return environment === 'test' ? `test:${process.pid}` : environment;
  }

  /**
   * Evaluates if a request is within rate limit using a sliding window.
   * If exceeded and throwOnLimit=true, throws HttpException(429).
   */
  async checkRateLimit(
    subject: string,
    options: RateLimitOptions,
    throwOnLimit = true,
  ): Promise<RateLimitResult> {
    const { action, limit, windowSeconds } = options;
    const key = `mixchat:${this.keyPrefix()}:ratelimit:${action}:${subject}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      const client = this.redis.getClient();

      const pipeline = client.pipeline();
      // Remove stale hits older than current window
      pipeline.zremrangebyscore(key, 0, windowStart);
      // Add current request hit
      pipeline.zadd(
        key,
        now,
        `${now}-${Math.random().toString(36).slice(2, 8)}`,
      );
      // Count hits in current window
      pipeline.zcard(key);
      // Refresh key expiration
      pipeline.expire(key, windowSeconds + 2);

      const results = await pipeline.exec();
      if (!results) {
        return {
          allowed: true,
          limit,
          remaining: limit,
          resetSeconds: windowSeconds,
        };
      }

      // results[2] is zcard count
      const count = (results[2][1] as number) || 1;
      const allowed = count <= limit;
      const remaining = Math.max(0, limit - count);
      const resetSeconds = windowSeconds;

      if (!allowed && throwOnLimit) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            code: 'RATE_LIMIT_EXCEEDED',
            message: `You're doing that too quickly. Please wait ${resetSeconds} seconds before trying again.`,
            retryAfter: resetSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return { allowed, limit, remaining, resetSeconds };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.warn(
        `Rate limit check failed gracefully for ${key}: ${(err as Error).message}`,
      );
      // Graceful fail-open on transient Redis failure
      return { allowed: true, limit, remaining: 1, resetSeconds: 0 };
    }
  }

  /**
   * Protect against rapid duplicate text bursts (duplicate comment/message spam).
   */
  async isDuplicateSpam(
    subject: string,
    action: string,
    contentHash: string,
    windowSeconds = 10,
  ): Promise<boolean> {
    const key = `mixchat:${this.keyPrefix()}:spam:dup:${action}:${subject}:${contentHash}`;
    try {
      const client = this.redis.getClient();
      const existing = await client.get(key);
      if (existing) {
        return true;
      }
      await client.set(key, '1', 'EX', windowSeconds);
      return false;
    } catch (err) {
      this.logger.warn(
        `Spam deduplication check error: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
