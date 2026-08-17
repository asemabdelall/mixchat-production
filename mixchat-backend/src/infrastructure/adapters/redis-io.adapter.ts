import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(
    app: any,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl =
      this.configService.get<string>('redis.url') ||
      process.env.REDIS_URL ||
      'redis://localhost:6380';

    try {
      this.pubClient = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 200, 3000),
      });

      this.subClient = this.pubClient.duplicate();

      this.pubClient.on('error', (err) => {
        this.logger.warn(`RedisIoAdapter PubClient Error: ${err.message}`);
      });

      this.subClient.on('error', (err) => {
        this.logger.warn(`RedisIoAdapter SubClient Error: ${err.message}`);
      });

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
      this.logger.log('Redis Socket.IO Adapter initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to connect Redis Socket.IO adapter: ${(error as Error).message}. Falling back to default in-memory adapter.`,
      );
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  async close(server: Server): Promise<void> {
    await super.close(server);
  }

  async dispose(): Promise<void> {
    if (this.pubClient) {
      await this.pubClient.quit().catch(() => this.pubClient?.disconnect());
    }
    if (this.subClient) {
      await this.subClient.quit().catch(() => this.subClient?.disconnect());
    }
    this.pubClient = null;
    this.subClient = null;
    this.adapterConstructor = null;
  }
}
