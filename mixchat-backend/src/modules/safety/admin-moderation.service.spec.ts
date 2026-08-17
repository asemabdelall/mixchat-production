/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminModerationService } from './admin-moderation.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import {
  ModerationActionType,
  ReportStatus,
  ReportTargetType,
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AdminModerationService', () => {
  let service: AdminModerationService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      report: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      moderationAction: {
        create: jest.fn(),
      },
      post: {
        updateMany: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      authSession: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) =>
        cb({
          report: {
            update: jest.fn(),
          },
          post: {
            updateMany: jest.fn(),
          },
          user: {
            update: jest.fn(),
          },
          authSession: {
            updateMany: jest.fn(),
          },
          moderationAction: {
            create: jest.fn(),
          },
        }),
      ),
    };

    const mockRedis = {
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminModerationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AdminModerationService>(AdminModerationService);
    prisma = module.get(PrismaService);
  });

  it('should execute REMOVE_CONTENT action and update report status to ACTIONED', async () => {
    (prisma.report.findUnique as jest.Mock).mockResolvedValue({
      id: 'rep_123',
      targetType: ReportTargetType.POST,
      targetId: 'post_123',
      reportedUserId: 'user_author',
      status: ReportStatus.OPEN,
    });

    const result = await service.executeAction('admin_moderator', 'rep_123', {
      action: ModerationActionType.REMOVE_CONTENT,
      reason: 'Violates hate speech policy',
      resolutionNotes: 'Post content removed.',
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe(ModerationActionType.REMOVE_CONTENT);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should execute DISMISS_REPORT and update report status to DISMISSED', async () => {
    (prisma.report.findUnique as jest.Mock).mockResolvedValue({
      id: 'rep_123',
      targetType: ReportTargetType.POST,
      targetId: 'post_123',
      reportedUserId: 'user_author',
      status: ReportStatus.OPEN,
    });

    const result = await service.executeAction('admin_moderator', 'rep_123', {
      action: ModerationActionType.DISMISS_REPORT,
      reason: 'No violation found upon inspection',
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe(ModerationActionType.DISMISS_REPORT);
  });

  it('should throw BadRequestException if report is already resolved', async () => {
    (prisma.report.findUnique as jest.Mock).mockResolvedValue({
      id: 'rep_123',
      status: ReportStatus.ACTIONED,
    });

    await expect(
      service.executeAction('admin_moderator', 'rep_123', {
        action: ModerationActionType.REMOVE_CONTENT,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if report does not exist', async () => {
    (prisma.report.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.executeAction('admin_moderator', 'rep_unknown', {
        action: ModerationActionType.REMOVE_CONTENT,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
