import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaIsHealthy: jest.Mock<Promise<boolean>, []>;
  let redisIsHealthy: jest.Mock<Promise<boolean>, []>;

  beforeEach(async () => {
    prismaIsHealthy = jest.fn<Promise<boolean>, []>();
    redisIsHealthy = jest.fn<Promise<boolean>, []>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: { isHealthy: prismaIsHealthy },
        },
        {
          provide: RedisService,
          useValue: { isHealthy: redisIsHealthy },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return liveness status ok with uptime', () => {
    const liveness = controller.getLiveness();
    expect(liveness.status).toBe('ok');
    expect(typeof liveness.uptime).toBe('number');
    expect(typeof liveness.timestamp).toBe('string');
  });

  it('should return readiness 200 ok when both postgres and redis are healthy', async () => {
    prismaIsHealthy.mockResolvedValue(true);
    redisIsHealthy.mockResolvedValue(true);

    const mockStatus = jest.fn().mockReturnThis();
    const mockRes = {
      status: mockStatus,
    } as unknown as Response;

    const readiness = await controller.getReadiness(mockRes);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.OK);
    expect(readiness.status).toBe('ok');
    expect(readiness.dependencies.database).toBe(true);
    expect(readiness.dependencies.redis).toBe(true);
  });

  it('should return readiness 503 degraded when a dependency fails', async () => {
    prismaIsHealthy.mockResolvedValue(false);
    redisIsHealthy.mockResolvedValue(true);

    const mockStatus = jest.fn().mockReturnThis();
    const mockRes = {
      status: mockStatus,
    } as unknown as Response;

    const readiness = await controller.getReadiness(mockRes);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(readiness.status).toBe('degraded');
    expect(readiness.dependencies.database).toBe(false);
    expect(readiness.dependencies.redis).toBe(true);
  });
});
