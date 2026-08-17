import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import {
  ExecuteModerationActionDto,
  ModerationActionResponseDto,
} from './dto/moderation-action.dto';
import {
  AdminReportDetailDto,
  PaginatedAdminReportsDto,
} from './dto/report-response.dto';
import {
  ModerationActionType,
  ReportStatus,
  ReportTargetType,
  UserStatus,
  PostStatus,
  CommentStatus,
  StoryStatus,
} from '@prisma/client';

@Injectable()
export class AdminModerationService {
  private readonly logger = new Logger(AdminModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * List reports for moderation queue with filters and cursor pagination.
   */
  async getReports(params: {
    status?: ReportStatus;
    targetType?: ReportTargetType;
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedAdminReportsDto> {
    const { status, targetType, cursor, limit = 20 } = params;
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const where: any = {};
    if (status) where.status = status;
    if (targetType) where.targetType = targetType;

    const [reports, totalCount] = await Promise.all([
      this.prisma.report.findMany({
        where,
        take: safeLimit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.report.count({ where }),
    ]);

    const hasMore = reports.length > safeLimit;
    const itemsToReturn = hasMore ? reports.slice(0, safeLimit) : reports;
    const nextCursor = hasMore
      ? itemsToReturn[itemsToReturn.length - 1].id
      : null;

    const items: AdminReportDetailDto[] = itemsToReturn.map((r) => ({
      id: r.id,
      reporterId: r.reporterId,
      reportedUserId: r.reportedUserId,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      details: r.details || undefined,
      status: r.status,
      priority: r.priority,
      snapshot: (r.snapshot as Record<string, unknown>) || undefined,
      resolvedAt: r.resolvedAt?.toISOString(),
      resolvedById: r.resolvedById || undefined,
      resolutionNotes: r.resolutionNotes || undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * Get single report details with snapshot.
   */
  async getReportById(reportId: string): Promise<AdminReportDetailDto> {
    const r = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!r) throw new NotFoundException('Report not found');

    return {
      id: r.id,
      reporterId: r.reporterId,
      reportedUserId: r.reportedUserId,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      details: r.details || undefined,
      status: r.status,
      priority: r.priority,
      snapshot: (r.snapshot as Record<string, unknown>) || undefined,
      resolvedAt: r.resolvedAt?.toISOString(),
      resolvedById: r.resolvedById || undefined,
      resolutionNotes: r.resolutionNotes || undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  /**
   * Execute moderation action on a report.
   */
  async executeAction(
    moderatorId: string,
    reportId: string,
    dto: ExecuteModerationActionDto,
  ): Promise<ModerationActionResponseDto> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (
      report.status === ReportStatus.ACTIONED ||
      report.status === ReportStatus.DISMISSED
    ) {
      throw new BadRequestException('This report has already been resolved');
    }

    await this.prisma.$transaction(async (tx) => {
      const isDismissal = dto.action === ModerationActionType.DISMISS_REPORT;
      const nextStatus = isDismissal
        ? ReportStatus.DISMISSED
        : ReportStatus.ACTIONED;

      // 1. Update report status
      await tx.report.update({
        where: { id: reportId },
        data: {
          status: nextStatus,
          resolvedAt: new Date(),
          resolvedById: moderatorId,
          resolutionNotes: dto.resolutionNotes || dto.reason || null,
        },
      });

      // 2. Execute domain moderation effect
      switch (dto.action) {
        case ModerationActionType.REMOVE_CONTENT:
          await this.removeContentEffect(
            tx,
            report.targetType,
            report.targetId,
          );
          break;

        case ModerationActionType.SUSPEND_USER: {
          const duration = dto.suspensionDurationSeconds || 86400 * 7; // Default 7 days
          const suspendedUntil = new Date(Date.now() + duration * 1000);
          await tx.user.update({
            where: { id: report.reportedUserId },
            data: {
              status: UserStatus.SUSPENDED,
              suspendedUntil,
              suspensionReason:
                dto.reason || 'Account suspended for policy violations',
            },
          });
          // Revoke active sessions
          await tx.authSession.updateMany({
            where: { userId: report.reportedUserId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          break;
        }

        case ModerationActionType.DISABLE_USER: {
          await tx.user.update({
            where: { id: report.reportedUserId },
            data: {
              status: UserStatus.DISABLED,
              suspensionReason:
                dto.reason ||
                'Account permanently disabled for critical safety violations',
            },
          });
          // Revoke active sessions
          await tx.authSession.updateMany({
            where: { userId: report.reportedUserId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          break;
        }

        case ModerationActionType.WARN_USER:
        case ModerationActionType.RESTRICT_USER:
        case ModerationActionType.DISMISS_REPORT:
        default:
          break;
      }

      // 3. Record immutable ModerationAction audit entry
      await tx.moderationAction.create({
        data: {
          moderatorId,
          action: dto.action,
          targetType: report.targetType,
          targetId: report.targetId,
          targetUserId: report.reportedUserId,
          reportId: report.id,
          reason: dto.reason || null,
          metadata: {
            resolutionNotes: dto.resolutionNotes,
            suspensionDurationSeconds: dto.suspensionDurationSeconds,
          },
        },
      });
    });

    // 4. Invalidate search and trending caches in Redis
    try {
      await this.redis.del('mixchat:search:trending');
    } catch {
      // Non-blocking
    }

    this.logger.log(
      `Moderation action executed: moderator=${moderatorId} report=${reportId} action=${dto.action}`,
    );

    return {
      success: true,
      message: `Action ${dto.action} executed successfully on report ${reportId}.`,
      reportId,
      action: dto.action,
      executedAt: new Date().toISOString(),
    };
  }

  /**
   * Helper to remove content across target types.
   */
  private async removeContentEffect(
    tx: any,
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<void> {
    switch (targetType) {
      case ReportTargetType.POST:
        await tx.post.updateMany({
          where: { id: targetId },
          data: { status: PostStatus.REMOVED_BY_MODERATION },
        });
        break;

      case ReportTargetType.COMMENT:
        await tx.comment.updateMany({
          where: { id: targetId },
          data: {
            status: CommentStatus.REMOVED_BY_MODERATION,
            content: '[Content removed by moderation]',
            deletedAt: new Date(),
          },
        });
        break;

      case ReportTargetType.STORY:
        await tx.story.updateMany({
          where: { id: targetId },
          data: {
            status: StoryStatus.REMOVED_BY_MODERATION,
            deletedAt: new Date(),
          },
        });
        break;

      case ReportTargetType.REEL:
        await tx.reel.updateMany({
          where: { id: targetId },
          data: {
            status: PostStatus.REMOVED_BY_MODERATION,
            deletedAt: new Date(),
          },
        });
        break;

      case ReportTargetType.MESSAGE:
        await tx.message.updateMany({
          where: { id: targetId },
          data: {
            text: '[Message removed by moderation]',
            deletedAt: new Date(),
          },
        });
        break;

      default:
        break;
    }
  }
}
