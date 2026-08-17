import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl =
      this.configService.get<string>('redis.url') ||
      process.env.REDIS_URL ||
      'redis://localhost:6380';

    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn(
              'Redis retry threshold exceeded; will retry in background',
            );
            return 5000;
          }
          return Math.min(times * 500, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      this.logger.warn(
        `Redis initial connect deferred: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => this.client?.disconnect());
      this.logger.log('Redis disconnected gracefully');
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client has not been initialized');
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.warn(
        `Redis get error for key ${key}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.warn(
        `Redis set error for key ${key}: ${(err as Error).message}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(
        `Redis del error for key ${key}: ${(err as Error).message}`,
      );
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) return [];
    try {
      return await this.client.lrange(key, start, stop);
    } catch (err) {
      this.logger.warn(
        `Redis lrange error for key ${key}: ${(err as Error).message}`,
      );
      return [];
    }
  }

  async lpush(key: string, ...values: string[]): Promise<void> {
    if (!this.client || values.length === 0) return;
    try {
      await this.client.lpush(key, ...values);
    } catch (err) {
      this.logger.warn(
        `Redis lpush error for key ${key}: ${(err as Error).message}`,
      );
    }
  }

  async lrem(key: string, count: number, value: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.lrem(key, count, value);
    } catch (err) {
      this.logger.warn(
        `Redis lrem error for key ${key}: ${(err as Error).message}`,
      );
    }
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.ltrim(key, start, stop);
    } catch (err) {
      this.logger.warn(
        `Redis ltrim error for key ${key}: ${(err as Error).message}`,
      );
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.expire(key, seconds);
    } catch (err) {
      this.logger.warn(
        `Redis expire error for key ${key}: ${(err as Error).message}`,
      );
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const pingResult = await this.client.ping();
      return pingResult === 'PONG';
    } catch {
      return false;
    }
  }
}
