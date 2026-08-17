/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AnonymousMatchmakingStore } from '../anonymous/anonymous-matchmaking.store';
import { ReportReason, ReportStatus, ReportTargetType } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      report: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      post: {
        findUnique: jest.fn(),
      },
      comment: {
        findUnique: jest.fn(),
      },
      story: {
        findUnique: jest.fn(),
      },
      reel: {
        findUnique: jest.fn(),
      },
      message: {
        findUnique: jest.fn(),
      },
    };

    const mockAnonymousStore = {
      getSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnonymousMatchmakingStore, useValue: mockAnonymousStore },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get(PrismaService);
  });

  it('should successfully report a post and derive author and snapshot', async () => {
    (prisma.report.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.post.findUnique as jest.Mock).mockResolvedValue({
      id: 'post_123',
      authorId: 'user_target',
      content: 'Inappropriate content',
      createdAt: new Date(),
      status: 'PUBLISHED',
      author: { id: 'user_target', username: 'targetuser' },
      media: [],
    });
    (prisma.report.create as jest.Mock).mockResolvedValue({
      id: 'rep_123',
      reporterId: 'user_reporter',
      reportedUserId: 'user_target',
      targetType: ReportTargetType.POST,
      targetId: 'post_123',
      reason: ReportReason.HARASSMENT,
      status: ReportStatus.OPEN,
      createdAt: new Date(),
    });

    const result = await service.createReport('user_reporter', {
      targetType: ReportTargetType.POST,
      targetId: 'post_123',
      reason: ReportReason.HARASSMENT,
      details: 'Bullying comments in post',
    });

    expect(result.id).toBe('rep_123');
    expect(result.status).toBe(ReportStatus.OPEN);
    expect(prisma.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reportedUserId: 'user_target',
          targetType: ReportTargetType.POST,
        }),
      }),
    );
  });

  it('should prevent self-reporting on user target', async () => {
    (prisma.report.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createReport('user_alice', {
        targetType: ReportTargetType.USER,
        targetId: 'user_alice',
        reason: ReportReason.SPAM,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if target post does not exist', async () => {
    (prisma.report.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createReport('user_alice', {
        targetType: ReportTargetType.POST,
        targetId: 'non_existent_post',
        reason: ReportReason.SPAM,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return existing receipt on duplicate pending report without failing', async () => {
    (prisma.report.findFirst as jest.Mock).mockResolvedValue({
      id: 'rep_existing',
      reporterId: 'user_alice',
      targetType: ReportTargetType.POST,
      targetId: 'post_123',
      reason: ReportReason.SPAM,
      status: ReportStatus.OPEN,
      createdAt: new Date(),
    });

    const result = await service.createReport('user_alice', {
      targetType: ReportTargetType.POST,
      targetId: 'post_123',
      reason: ReportReason.SPAM,
    });

    expect(result.id).toBe('rep_existing');
    expect(prisma.report.create).not.toHaveBeenCalled();
  });
});
