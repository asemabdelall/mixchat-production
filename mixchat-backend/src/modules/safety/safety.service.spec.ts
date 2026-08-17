/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { SafetyService } from './safety.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SafetyService', () => {
  let service: SafetyService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
      block: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      mute: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) =>
        cb({
          block: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
          },
          follow: {
            findUnique: jest.fn().mockResolvedValue(null),
            delete: jest.fn(),
          },
          followRequest: {
            deleteMany: jest.fn(),
          },
          closeFriend: {
            deleteMany: jest.fn(),
          },
          user: {
            update: jest.fn(),
          },
        }),
      ),
    };

    const mockRedis = {
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<SafetyService>(SafetyService);
    prisma = module.get(PrismaService);
  });

  it('should block a user and execute cascade cleanup', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_bob',
      username: 'bob',
    });

    const result = await service.blockUser('user_alice', 'user_bob');
    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should prevent self-blocking', async () => {
    await expect(service.blockUser('user_alice', 'user_alice')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw NotFoundException if blocked user does not exist', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.blockUser('user_alice', 'user_ghost')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should successfully mute and unmute a user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user_bob' });
    (prisma.mute.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'mute_123',
        muterId: 'user_alice',
        mutedId: 'user_bob',
      });

    const muteRes = await service.muteUser('user_alice', 'user_bob');
    expect(muteRes.success).toBe(true);
    expect(prisma.mute.create).toHaveBeenCalled();

    const unmuteRes = await service.unmuteUser('user_alice', 'user_bob');
    expect(unmuteRes.success).toBe(true);
    expect(prisma.mute.delete).toHaveBeenCalled();
  });
});
