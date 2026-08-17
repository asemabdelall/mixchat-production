import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { HttpException } from '@nestjs/common';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockPipeline = {
      zremrangebyscore: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 3], // 3 requests in current window
        [null, 1],
      ]),
    };

    const mockRedisClient = {
      pipeline: jest.fn().mockReturnValue(mockPipeline),
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    redis = module.get(RedisService);
  });

  it('should allow request when within limit', async () => {
    const result = await service.checkRateLimit('user_123', {
      action: 'POST_CREATE',
      limit: 5,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should throw 429 HttpException when limit is exceeded', async () => {
    const mockPipeline = {
      zremrangebyscore: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0],
        [null, 1],
        [null, 6], // 6 requests in window exceeding limit 5
        [null, 1],
      ]),
    };
    (redis.getClient as jest.Mock).mockReturnValue({
      pipeline: jest.fn().mockReturnValue(mockPipeline),
    });

    await expect(
      service.checkRateLimit('user_123', {
        action: 'POST_CREATE',
        limit: 5,
        windowSeconds: 60,
      }),
    ).rejects.toThrow(HttpException);
  });

  it('should detect duplicate spam text bursts', async () => {
    const client = redis.getClient();
    (client.get as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('1');

    const firstCheck = await service.isDuplicateSpam(
      'user_123',
      'COMMENT',
      'hash_abc',
    );
    expect(firstCheck).toBe(false);

    const secondCheck = await service.isDuplicateSpam(
      'user_123',
      'COMMENT',
      'hash_abc',
    );
    expect(secondCheck).toBe(true);
  });
});
