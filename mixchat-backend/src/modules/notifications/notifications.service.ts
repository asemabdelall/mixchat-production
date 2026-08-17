import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ChatGateway } from '../chat/realtime/chat.gateway';
import { RealtimeEvents } from '../chat/realtime/realtime-events';
import { WebPushService } from './web-push.service';
import {
  ListNotificationsQueryDto,
  NotificationFilter,
  NotificationResponseDto,
  NotificationsListResponseDto,
  UnreadCountResponseDto,
} from './dto/notification.dto';

interface Cursor {
  createdAt: string;
  id: string;
}

const actorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

const notificationInclude = {
  actor: { select: actorSelect },
} satisfies Prisma.NotificationInclude;

type NotificationRecord = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webPushService: WebPushService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway?: ChatGateway,
  ) {}

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(
      JSON.stringify({ createdAt: createdAt.toISOString(), id }),
    ).toString('base64url');
  }

  private decodeCursor(value?: string): Cursor | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as Cursor;
      if (
        !parsed.id ||
        !parsed.createdAt ||
        isNaN(Date.parse(parsed.createdAt))
      ) {
        throw new Error('invalid');
      }
      return parsed;
    } catch {
      throw new BadRequestException({
        code: 'NOTIFICATION_CURSOR_INVALID',
        message: 'Invalid pagination cursor',
      });
    }
  }

  resolveTargetUrl(
    type: NotificationType,
    entityId: string,
    metadata?: Record<string, any> | null,
  ): string {
    switch (type) {
      case NotificationType.LIKE_POST:
      case NotificationType.COMMENT_POST:
      case NotificationType.REPOST_POST:
        return `/feed/${entityId}`;
      case NotificationType.REPLY_COMMENT:
      case NotificationType.MENTION_COMMENT:
        if (metadata?.reelId) {
          return `/reels?id=${metadata.reelId}`;
        }
        return `/feed/${metadata?.postId || entityId}`;
      case NotificationType.MENTION_POST:
        return `/feed/${entityId}`;
      case NotificationType.FOLLOW:
      case NotificationType.FOLLOW_REQUEST:
      case NotificationType.FOLLOW_ACCEPT:
        return `/profile/${metadata?.username || entityId}`;
      case NotificationType.MESSAGE_NEW:
        return `/chat`;
      case NotificationType.STORY_REACTION:
      case NotificationType.STORY_REPLY:
        return `/stories`;
      case NotificationType.REEL_LIKE:
      case NotificationType.REEL_COMMENT:
        return `/reels?id=${entityId}`;
      default:
        return '/activity';
    }
  }

  private toDto(record: NotificationRecord): NotificationResponseDto {
    const targetUrl = this.resolveTargetUrl(
      record.type,
      record.entityId,
      record.metadata as Record<string, any> | null,
    );
    return {
      id: record.id,
      type: record.type,
      entityId: record.entityId,
      entityType: record.entityType,
      targetUrl,
      actor: record.actor
        ? {
            id: record.actor.id,
            username: record.actor.username,
            displayName: record.actor.displayName,
            avatarUrl: record.actor.avatarUrl,
            isVerified: record.actor.isVerified,
          }
        : null,
      readAt: record.readAt?.toISOString() ?? null,
      metadata: (record.metadata as Record<string, any> | null) ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private buildPushContent(dto: NotificationResponseDto): {
    title: string;
    body: string;
  } {
    const actorName =
      dto.actor?.displayName ||
      (dto.actor?.username ? `@${dto.actor.username}` : 'Someone');

    switch (dto.type) {
      case NotificationType.FOLLOW:
        return {
          title: 'New Follower',
          body: `${actorName} started following you`,
        };
      case NotificationType.FOLLOW_REQUEST:
        return {
          title: 'Follow Request',
          body: `${actorName} sent you a follow request`,
        };
      case NotificationType.FOLLOW_ACCEPT:
        return {
          title: 'Follow Request Accepted',
          body: `${actorName} accepted your follow request`,
        };
      case NotificationType.LIKE_POST:
        return {
          title: 'Post Liked',
          body: `${actorName} liked your post`,
        };
      case NotificationType.LIKE_COMMENT:
        return {
          title: 'Comment Liked',
          body: `${actorName} liked your comment`,
        };
      case NotificationType.COMMENT_POST:
        return {
          title: 'New Comment',
          body: `${actorName} commented on your post`,
        };
      case NotificationType.REPLY_COMMENT:
        return {
          title: 'New Reply',
          body: `${actorName} replied to your comment`,
        };
      case NotificationType.MENTION_POST:
      case NotificationType.MENTION_COMMENT:
        return {
          title: 'New Mention',
          body: `${actorName} mentioned you`,
        };
      case NotificationType.REPOST_POST:
        return {
          title: 'Post Reposted',
          body: `${actorName} reposted your post`,
        };
      case NotificationType.MESSAGE_NEW:
        return {
          title: `New message from ${actorName}`,
          body:
            (dto.metadata?.previewText as string) || 'Sent you a new message',
        };
      case NotificationType.STORY_REACTION:
        return {
          title: 'Story Reaction',
          body: `${actorName} reacted to your story`,
        };
      case NotificationType.STORY_REPLY:
        return {
          title: 'Story Reply',
          body: `${actorName} replied to your story`,
        };
      case NotificationType.REEL_LIKE:
        return {
          title: 'Reel Liked',
          body: `${actorName} liked your reel`,
        };
      case NotificationType.REEL_COMMENT:
        return {
          title: 'Reel Comment',
          body: `${actorName} commented on your reel`,
        };
      default:
        return {
          title: 'MixChat Activity',
          body: `${actorName} interacted with your content`,
        };
    }
  }

  /**
   * Create a new notification with deduplication, realtime Socket.IO broadcast, and WebPush delivery.
   */
  async createNotification(data: {
    recipientId: string;
    actorId?: string | null;
    type: NotificationType;
    entityId: string;
    entityType: string;
    metadata?: Record<string, any>;
  }): Promise<NotificationResponseDto | null> {
    // 1. Never notify self
    if (data.actorId && data.recipientId === data.actorId) {
      return null;
    }

    // 2. Block check: Never notify across blocked relationships
    if (data.actorId) {
      const isBlocked = await this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: data.recipientId, blockedId: data.actorId },
            { blockerId: data.actorId, blockedId: data.recipientId },
          ],
        },
      });
      if (isBlocked) {
        return null;
      }
    }

    try {
      // 3. Check for recent unread duplicate (e.g. repeated liking/unliking or follow requests)
      const existing = await this.prisma.notification.findFirst({
        where: {
          recipientId: data.recipientId,
          ...(data.actorId ? { actorId: data.actorId } : {}),
          type: data.type,
          entityId: data.entityId,
          readAt: null,
        },
      });

      let record: NotificationRecord;
      if (existing) {
        // Refresh timestamp and metadata
        record = await this.prisma.notification.update({
          where: { id: existing.id },
          data: {
            createdAt: new Date(),
            metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
          },
          include: notificationInclude,
        });
      } else {
        record = await this.prisma.notification.create({
          data: {
            recipientId: data.recipientId,
            actorId: data.actorId || null,
            type: data.type,
            entityId: data.entityId,
            entityType: data.entityType,
            metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
          },
          include: notificationInclude,
        });
      }

      const dto = this.toDto(record);
      const unreadCount = await this.getUnreadCountNumber(data.recipientId);

      // 3. Real-time WebSocket notification broadcast to private user room
      if (this.chatGateway?.server) {
        this.chatGateway.server
          .to(`user:${data.recipientId}`)
          .emit(RealtimeEvents.NOTIFICATION_NEW, dto);
        this.chatGateway.server
          .to(`user:${data.recipientId}`)
          .emit(RealtimeEvents.NOTIFICATION_UNREAD_COUNT, { unreadCount });
      }

      // 4. Asynchronous Web Push delivery (never blocks response or throws)
      const pushContent = this.buildPushContent(dto);
      void this.webPushService.sendPushToUser(data.recipientId, {
        notificationId: dto.id,
        type: dto.type,
        title: pushContent.title,
        body: pushContent.body,
        icon: dto.actor?.avatarUrl || '/mixchat-icon.png',
        badge: '/icons/icon-192.png',
        url: dto.targetUrl || '/activity',
        tag: `notif:${dto.type}:${dto.entityId}`,
        data: {
          url: dto.targetUrl || '/activity',
          notificationId: dto.id,
        },
      });

      return dto;
    } catch (err) {
      this.logger.warn(
        `Failed to create notification: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private mapFilterToTypes(
    filter?: NotificationFilter,
  ): NotificationType[] | undefined {
    switch (filter) {
      case NotificationFilter.SOCIAL:
        return [
          NotificationType.FOLLOW,
          NotificationType.FOLLOW_REQUEST,
          NotificationType.FOLLOW_ACCEPT,
        ];
      case NotificationFilter.LIKES:
        return [
          NotificationType.LIKE_POST,
          NotificationType.LIKE_COMMENT,
          NotificationType.REPOST_POST,
          NotificationType.REEL_LIKE,
          NotificationType.STORY_REACTION,
        ];
      case NotificationFilter.COMMENTS:
        return [
          NotificationType.COMMENT_POST,
          NotificationType.REPLY_COMMENT,
          NotificationType.REEL_COMMENT,
          NotificationType.STORY_REPLY,
        ];
      case NotificationFilter.MENTIONS:
        return [
          NotificationType.MENTION_POST,
          NotificationType.MENTION_COMMENT,
        ];
      case NotificationFilter.ALL:
      default:
        return undefined;
    }
  }

  /**
   * List paginated notifications for the authenticated user.
   */
  async listNotifications(
    userId: string,
    query: ListNotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    const limit = Math.min(query.limit ?? 20, 50);
    const cursor = this.decodeCursor(query.cursor);
    const types = this.mapFilterToTypes(query.filter);

    const where: Prisma.NotificationWhereInput = {
      recipientId: userId,
      ...(types ? { type: { in: types } } : {}),
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              {
                createdAt: new Date(cursor.createdAt),
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    };

    const [records, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        take: limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: notificationInclude,
      }),
      this.getUnreadCountNumber(userId),
    ]);

    const hasMore = records.length > limit;
    const pageItems = hasMore ? records.slice(0, limit) : records;

    const nextCursor =
      hasMore && pageItems.length > 0
        ? this.encodeCursor(
            pageItems[pageItems.length - 1].createdAt,
            pageItems[pageItems.length - 1].id,
          )
        : null;

    return {
      items: pageItems.map((item) => this.toDto(item)),
      nextCursor,
      hasMore,
      unreadCount,
    };
  }

  private async getUnreadCountNumber(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: userId, readAt: null },
    });
  }

  /**
   * Get unread notifications count for the authenticated user.
   */
  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    const unreadCount = await this.getUnreadCountNumber(userId);
    return { unreadCount };
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<{ message: string; unreadCount: number }> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.recipientId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.readAt) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      });
    }

    const unreadCount = await this.getUnreadCountNumber(userId);

    if (this.chatGateway?.server) {
      this.chatGateway.server
        .to(`user:${userId}`)
        .emit(RealtimeEvents.NOTIFICATION_UNREAD_COUNT, { unreadCount });
    }

    return { message: 'Notification marked as read', unreadCount };
  }

  /**
   * Mark all notifications as read for the user.
   */
  async markAllAsRead(
    userId: string,
  ): Promise<{ message: string; unreadCount: number }> {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });

    if (this.chatGateway?.server) {
      this.chatGateway.server
        .to(`user:${userId}`)
        .emit(RealtimeEvents.NOTIFICATION_UNREAD_COUNT, { unreadCount: 0 });
    }

    return { message: 'All notifications marked as read', unreadCount: 0 };
  }
}
