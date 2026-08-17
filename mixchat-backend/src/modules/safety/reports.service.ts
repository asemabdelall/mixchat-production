import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AnonymousMatchmakingStore } from '../anonymous/anonymous-matchmaking.store';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportReceiptDto } from './dto/report-response.dto';
import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
  Prisma,
} from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anonymousStore: AnonymousMatchmakingStore,
  ) {}

  /**
   * Create a unified safety report.
   * Server derives reported user and captures an immutable evidence snapshot.
   */
  async createReport(
    reporterId: string,
    dto: CreateReportDto,
  ): Promise<ReportReceiptDto> {
    // 1. Check for duplicate pending reports to prevent spam
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: { in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW] },
      },
    });

    if (existing) {
      return {
        id: existing.id,
        targetType: existing.targetType,
        targetId: existing.targetId,
        reason: existing.reason,
        status: existing.status,
        createdAt: existing.createdAt.toISOString(),
        message:
          'A report for this content is already under review by our safety team.',
      };
    }

    // 2. Validate target and derive reported user + snapshot
    const { reportedUserId, snapshot } = await this.resolveTarget(
      reporterId,
      dto.targetType,
      dto.targetId,
    );

    // 3. Compute priority based on safety urgency
    let priority = 0;
    if (
      dto.reason === ReportReason.SELF_HARM ||
      dto.reason === ReportReason.VIOLENCE
    ) {
      priority = 2; // Urgent
    } else if (
      dto.reason === ReportReason.HATE_OR_ABUSE ||
      dto.reason === ReportReason.SEXUAL_CONTENT ||
      dto.reason === ReportReason.HARASSMENT
    ) {
      priority = 1; // High
    }

    // 4. Create durable report
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details ? dto.details.trim().slice(0, 1000) : null,
        status: ReportStatus.OPEN,
        priority,
        snapshot: snapshot as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Safety report created: id=${report.id} targetType=${dto.targetType} reason=${dto.reason} priority=${priority}`,
    );

    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      message:
        'Thank you for helping keep MixChat safe. Our trust & safety team will review this report.',
    };
  }

  /**
   * Resolve target, assert accessibility, and create evidence snapshot.
   */
  private async resolveTarget(
    reporterId: string,
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<{ reportedUserId: string; snapshot: Record<string, unknown> }> {
    switch (targetType) {
      case ReportTargetType.USER: {
        if (targetId === reporterId) {
          throw new BadRequestException('Cannot report yourself');
        }
        const user = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            isVerified: true,
            createdAt: true,
          },
        });
        if (!user) throw new NotFoundException('Reported user not found');
        return {
          reportedUserId: user.id,
          snapshot: {
            username: user.username,
            displayName: user.displayName,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            userCreatedAt: user.createdAt.toISOString(),
          },
        };
      }

      case ReportTargetType.POST: {
        const post = await this.prisma.post.findUnique({
          where: { id: targetId },
          include: {
            author: { select: { id: true, username: true } },
            media: {
              include: {
                mediaObject: { select: { objectKey: true, kind: true } },
              },
            },
          },
        });
        if (!post) throw new NotFoundException('Reported post not found');
        return {
          reportedUserId: post.authorId,
          snapshot: {
            authorUsername: post.author.username,
            content: post.content,
            mediaKeys: post.media.map((m) => m.mediaObject.objectKey),
            postCreatedAt: post.createdAt.toISOString(),
            status: post.status,
          },
        };
      }

      case ReportTargetType.COMMENT: {
        const comment = await this.prisma.comment.findUnique({
          where: { id: targetId },
          include: {
            author: { select: { id: true, username: true } },
          },
        });
        if (!comment) throw new NotFoundException('Reported comment not found');
        return {
          reportedUserId: comment.authorId,
          snapshot: {
            authorUsername: comment.author.username,
            content: comment.content,
            postId: comment.postId,
            reelId: comment.reelId,
            commentCreatedAt: comment.createdAt.toISOString(),
          },
        };
      }

      case ReportTargetType.STORY: {
        const story = await this.prisma.story.findUnique({
          where: { id: targetId },
          include: {
            author: { select: { id: true, username: true } },
            mediaObject: { select: { objectKey: true, kind: true } },
          },
        });
        if (!story) throw new NotFoundException('Reported story not found');
        return {
          reportedUserId: story.authorId,
          snapshot: {
            authorUsername: story.author.username,
            caption: story.caption,
            mediaObjectKey: story.mediaObject?.objectKey,
            storyCreatedAt: story.createdAt.toISOString(),
          },
        };
      }

      case ReportTargetType.REEL: {
        const reel = await this.prisma.reel.findUnique({
          where: { id: targetId },
          include: {
            author: { select: { id: true, username: true } },
            mediaObject: { select: { objectKey: true } },
          },
        });
        if (!reel) throw new NotFoundException('Reported reel not found');
        return {
          reportedUserId: reel.authorId,
          snapshot: {
            authorUsername: reel.author.username,
            caption: reel.caption,
            audioTitle: reel.audioTitle,
            mediaObjectKey: reel.mediaObject?.objectKey,
            reelCreatedAt: reel.createdAt.toISOString(),
          },
        };
      }

      case ReportTargetType.MESSAGE: {
        const message = await this.prisma.message.findUnique({
          where: { id: targetId },
          include: {
            sender: { select: { id: true, username: true } },
            conversation: {
              include: {
                participants: { where: { userId: reporterId, leftAt: null } },
              },
            },
          },
        });
        if (!message) throw new NotFoundException('Reported message not found');
        if (message.conversation.participants.length === 0) {
          throw new ForbiddenException(
            'Cannot report a message from a conversation you are not part of',
          );
        }
        return {
          reportedUserId: message.senderId,
          snapshot: {
            senderUsername: message.sender.username,
            text: message.text,
            type: message.type,
            conversationId: message.conversationId,
            messageCreatedAt: message.createdAt.toISOString(),
          },
        };
      }

      case ReportTargetType.ANONYMOUS_SESSION: {
        const session = await this.anonymousStore.getSession(targetId);
        if (!session) {
          throw new NotFoundException('Anonymous session expired or not found');
        }
        const isParticipantA = session.participantA.userId === reporterId;
        const isParticipantB = session.participantB.userId === reporterId;
        if (!isParticipantA && !isParticipantB) {
          throw new ForbiddenException(
            'Cannot report an anonymous session you are not part of',
          );
        }
        const partner = isParticipantA
          ? session.participantB
          : session.participantA;
        const reporter = isParticipantA
          ? session.participantA
          : session.participantB;

        return {
          reportedUserId: partner.userId,
          snapshot: {
            anonymousSessionId: session.id,
            reporterPersona: reporter.persona.displayName,
            partnerPersona: partner.persona.displayName,
            messageCount: session.messages?.length || 0,
            sessionStartedAt: session.startedAt,
          },
        };
      }

      default:
        throw new BadRequestException('Unsupported report target type');
    }
  }

  /**
   * Get user's own submitted reports
   */
  async getMyReports(
    reporterId: string,
    limit = 20,
  ): Promise<ReportReceiptDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const reports = await this.prisma.report.findMany({
      where: { reporterId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });

    return reports.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      message: 'Report on file.',
    }));
  }
}
