import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MediaService } from '../media/media.service';
import { StoriesPolicyService } from './stories-policy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { ReactStoryDto } from './dto/react-story.dto';
import { CreateStoryReplyDto } from './dto/create-story-reply.dto';
import {
  ActiveStoriesResponseDto,
  StoryArchiveResponseDto,
  StoryGroupDto,
  StoryItemDto,
  StoryRepliesResponseDto,
  StoryReplyItemDto,
  StoryViewerItemDto,
  StoryViewersResponseDto,
} from './dto/story-response.dto';
import {
  MediaKind,
  MediaStatus,
  NotificationType,
  StoryAudience,
  StoryReactionType,
  StoryStatus,
} from '@prisma/client';

interface DecodedCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly policy: StoriesPolicyService,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService,
  ) {}

  private encodeCursor(date: Date, id: string): string {
    const payload: DecodedCursor = {
      createdAt: date.toISOString(),
      id,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decodeCursor(cursor?: string): DecodedCursor | null {
    if (!cursor) return null;
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as DecodedCursor;
      if (
        !parsed.createdAt ||
        !parsed.id ||
        isNaN(Date.parse(parsed.createdAt))
      ) {
        throw new BadRequestException({
          code: 'CURSOR_INVALID',
          message: 'Malformed pagination cursor',
        });
      }
      return parsed;
    } catch {
      throw new BadRequestException({
        code: 'CURSOR_INVALID',
        message: 'Malformed pagination cursor',
      });
    }
  }

  /**
   * Helper to format a Story DB entity into StoryItemDto
   */
  private async formatStoryItem(
    story: any,
    viewerId?: string,
    isArchive = false,
  ): Promise<StoryItemDto> {
    const mediaDto = await this.mediaService.toDto(story.mediaObject);

    const hasViewed =
      viewerId && story.views && story.views.length > 0 ? true : false;
    const userReaction =
      viewerId && story.reactions && story.reactions.length > 0
        ? (story.reactions[0].reaction as StoryReactionType)
        : null;

    const isAuthor = viewerId === story.authorId;

    return {
      id: story.id,
      caption: story.caption,
      audience: story.audience,
      status: story.status,
      viewsCount: isAuthor || isArchive ? story.viewsCount : undefined,
      createdAt: story.createdAt.toISOString(),
      expiresAt: story.expiresAt.toISOString(),
      media: {
        id: story.mediaObject.id,
        url: mediaDto.publicUrl || '',
        kind: story.mediaObject.kind,
        mimeType: story.mediaObject.mimeType,
        width: story.mediaObject.width,
        height: story.mediaObject.height,
        durationMs: story.mediaObject.durationMs,
      },
      author: {
        id: story.author.id,
        username: story.author.username,
        displayName: story.author.displayName || story.author.username,
        avatarUrl: story.author.avatarUrl,
        isVerified: story.author.isVerified,
        isPremium: story.author.isPremium,
      },
      viewer: {
        hasViewed: !!hasViewed,
        reaction: userReaction,
      },
    };
  }

  /**
   * Create a new 24h Story referencing a READY MediaObject
   */
  async createStory(
    userId: string,
    dto: CreateStoryDto,
  ): Promise<StoryItemDto> {
    // 1. Validate MediaObject
    const media = await this.prisma.mediaObject.findUnique({
      where: { id: dto.mediaObjectId },
    });

    if (!media) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'The specified media object does not exist',
      });
    }

    if (media.ownerId !== userId) {
      throw new BadRequestException({
        code: 'MEDIA_NOT_OWNED',
        message: 'You can only create stories with your own media',
      });
    }

    if (media.status !== MediaStatus.READY) {
      throw new BadRequestException({
        code: 'MEDIA_NOT_READY',
        message: 'Media upload has not completed successfully',
      });
    }

    if (media.kind !== MediaKind.IMAGE && media.kind !== MediaKind.VIDEO) {
      throw new BadRequestException({
        code: 'MEDIA_KIND_UNSUPPORTED',
        message: 'Only image and video media can be used for stories',
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours exact

    const story = await this.prisma.story.create({
      data: {
        authorId: userId,
        mediaObjectId: dto.mediaObjectId,
        caption: dto.caption?.trim() || null,
        audience: dto.audience || StoryAudience.PUBLIC,
        status: StoryStatus.ACTIVE,
        expiresAt,
        createdAt: now,
      },
      include: {
        author: true,
        mediaObject: true,
        views: { where: { viewerId: userId } },
        reactions: { where: { userId: userId } },
      },
    });

    return this.formatStoryItem(story, userId);
  }

  /**
   * Get Active Story feed grouped by author
   */
  async getActiveStories(viewerId: string): Promise<ActiveStoriesResponseDto> {
    const now = new Date();

    // 1. Get blocked and muted users
    const [blocks, mutes] = await Promise.all([
      this.prisma.block.findMany({
        where: {
          OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
        },
        select: { blockerId: true, blockedId: true },
      }),
      this.prisma.mute.findMany({
        where: { muterId: viewerId },
        select: { mutedId: true },
      }),
    ]);

    const excludedUserIds = new Set<string>();
    blocks.forEach((b) => {
      if (b.blockerId === viewerId) excludedUserIds.add(b.blockedId);
      if (b.blockedId === viewerId) excludedUserIds.add(b.blockerId);
    });
    mutes.forEach((m) => excludedUserIds.add(m.mutedId));

    // 2. Get list of followed authors
    const follows = await this.prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const followingIds = new Set(follows.map((f) => f.followingId));

    // 3. Get list of authors who added viewer as close friend
    const closeFriends = await this.prisma.closeFriend.findMany({
      where: { friendId: viewerId },
      select: { userId: true },
    });
    const closeFriendAuthorIds = new Set(closeFriends.map((cf) => cf.userId));

    // 4. Fetch all candidate active stories
    const activeStories = await this.prisma.story.findMany({
      where: {
        status: StoryStatus.ACTIVE,
        expiresAt: { gt: now },
        deletedAt: null,
        authorId: { notIn: Array.from(excludedUserIds) },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        author: true,
        mediaObject: true,
        views: { where: { viewerId } },
        reactions: { where: { userId: viewerId } },
      },
    });

    // 5. Filter accessible stories based on audience & privacy
    const accessibleStories = activeStories.filter((s) => {
      if (s.authorId === viewerId) return true; // Own stories

      if (s.audience === StoryAudience.CLOSE_FRIENDS) {
        return closeFriendAuthorIds.has(s.authorId);
      }

      if (s.audience === StoryAudience.FOLLOWERS || s.author.isPrivate) {
        return followingIds.has(s.authorId);
      }

      // Public story and non-private author
      return true;
    });

    // 6. Group stories by author
    const groupsMap = new Map<
      string,
      { author: any; stories: any[]; latestStoryAt: Date }
    >();

    for (const story of accessibleStories) {
      let group = groupsMap.get(story.authorId);
      if (!group) {
        group = {
          author: story.author,
          stories: [],
          latestStoryAt: story.createdAt,
        };
        groupsMap.set(story.authorId, group);
      }
      group.stories.push(story);
      if (story.createdAt > group.latestStoryAt) {
        group.latestStoryAt = story.createdAt;
      }
    }

    // 7. Format groups and calculate hasUnseen
    const groups: StoryGroupDto[] = [];

    for (const grp of groupsMap.values()) {
      const formattedStories = await Promise.all(
        grp.stories.map((s) => this.formatStoryItem(s, viewerId)),
      );

      const hasUnseen = formattedStories.some((s) => !s.viewer.hasViewed);

      groups.push({
        author: {
          id: grp.author.id,
          username: grp.author.username,
          displayName: grp.author.displayName || grp.author.username,
          avatarUrl: grp.author.avatarUrl,
          isVerified: grp.author.isVerified,
          isPremium: grp.author.isPremium,
        },
        stories: formattedStories,
        hasUnseen,
        latestStoryAt: grp.latestStoryAt.toISOString(),
      });
    }

    // 8. Order groups:
    // Own group first (if exists), then unseen groups, then seen groups, sorted by latestStoryAt DESC
    groups.sort((a, b) => {
      if (a.author.id === viewerId) return -1;
      if (b.author.id === viewerId) return 1;

      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;

      return (
        new Date(b.latestStoryAt).getTime() -
        new Date(a.latestStoryAt).getTime()
      );
    });

    return { groups };
  }

  /**
   * Get a single story by ID with full policy check
   */
  async getStoryById(storyId: string, viewerId: string): Promise<StoryItemDto> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        author: true,
        mediaObject: true,
        views: { where: { viewerId } },
        reactions: { where: { userId: viewerId } },
      },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    await this.policy.assertCanViewStory(story, viewerId);
    return this.formatStoryItem(story, viewerId);
  }

  /**
   * Record a view for a story (idempotent, does not count owner self-view)
   */
  async recordView(
    storyId: string,
    viewerId: string,
  ): Promise<{ success: boolean }> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { author: true },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    await this.policy.assertCanViewStory(story, viewerId);

    // Self-view does not increment unique count or insert StoryView
    if (story.authorId === viewerId) {
      return { success: true };
    }

    // Atomically insert view and increment viewsCount only on first view
    try {
      await this.prisma.$transaction(async (tx) => {
        const existingView = await tx.storyView.findUnique({
          where: {
            storyId_viewerId: {
              storyId,
              viewerId,
            },
          },
        });

        if (!existingView) {
          await tx.storyView.create({
            data: {
              storyId,
              viewerId,
            },
          });

          await tx.story.update({
            where: { id: storyId },
            data: {
              viewsCount: { increment: 1 },
            },
          });
        }
      });
    } catch {
      // Idempotent catch
    }

    return { success: true };
  }

  /**
   * Get viewers list for a story (Author only, cursor-paginated)
   */
  async getViewers(
    storyId: string,
    viewerId: string,
    cursor?: string,
    limit = 20,
  ): Promise<StoryViewersResponseDto> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    this.policy.assertCanViewViewersList(story.authorId, viewerId);

    const decoded = this.decodeCursor(cursor);

    const where: any = {
      storyId,
    };

    if (decoded) {
      where.OR = [
        { viewedAt: { lt: new Date(decoded.createdAt) } },
        { viewedAt: new Date(decoded.createdAt), id: { lt: decoded.id } },
      ];
    }

    const [views, totalCount] = await Promise.all([
      this.prisma.storyView.findMany({
        where,
        take: limit + 1,
        orderBy: [{ viewedAt: 'desc' }, { id: 'desc' }],
        include: {
          viewer: {
            include: {
              storyReactions: {
                where: { storyId },
              },
            },
          },
        },
      }),
      this.prisma.storyView.count({ where: { storyId } }),
    ]);

    const hasNextPage = views.length > limit;
    const pageItems = hasNextPage ? views.slice(0, limit) : views;

    const items: StoryViewerItemDto[] = pageItems.map((v) => {
      const userReaction =
        v.viewer.storyReactions && v.viewer.storyReactions.length > 0
          ? v.viewer.storyReactions[0].reaction
          : null;

      return {
        id: v.viewer.id,
        username: v.viewer.username,
        displayName: v.viewer.displayName || v.viewer.username,
        avatarUrl: v.viewer.avatarUrl,
        isVerified: v.viewer.isVerified,
        viewedAt: v.viewedAt.toISOString(),
        reaction: userReaction,
      };
    });

    const nextCursor =
      hasNextPage && pageItems.length > 0
        ? this.encodeCursor(
            pageItems[pageItems.length - 1].viewedAt,
            pageItems[pageItems.length - 1].id,
          )
        : null;

    return {
      items,
      pageInfo: {
        nextCursor,
        hasNextPage,
      },
      totalCount,
    };
  }

  /**
   * React to a story (idempotent upsert)
   */
  async reactToStory(
    storyId: string,
    userId: string,
    dto: ReactStoryDto,
  ): Promise<{ success: boolean; reaction: StoryReactionType }> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { author: true },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    await this.policy.assertCanReact(story, userId);

    // Record view if not yet viewed
    void this.recordView(storyId, userId);

    await this.prisma.storyReaction.upsert({
      where: {
        storyId_userId: {
          storyId,
          userId,
        },
      },
      create: {
        storyId,
        userId,
        reaction: dto.reaction,
      },
      update: {
        reaction: dto.reaction,
      },
    });

    if (this.notificationsService && story.authorId !== userId) {
      void this.notificationsService.createNotification({
        recipientId: story.authorId,
        actorId: userId,
        type: NotificationType.STORY_REACTION,
        entityId: storyId,
        entityType: 'STORY',
        metadata: {
          reaction: dto.reaction,
        },
      });
    }

    return { success: true, reaction: dto.reaction };
  }

  /**
   * Remove reaction from story
   */
  async removeReaction(
    storyId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    try {
      await this.prisma.storyReaction.delete({
        where: {
          storyId_userId: {
            storyId,
            userId,
          },
        },
      });
    } catch {
      // Idempotent
    }

    return { success: true };
  }

  /**
   * Reply to a story
   */
  async createReply(
    storyId: string,
    senderId: string,
    dto: CreateStoryReplyDto,
  ): Promise<StoryReplyItemDto> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { author: true },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    await this.policy.assertCanReply(story, senderId);

    // Record view
    void this.recordView(storyId, senderId);

    const reply = await this.prisma.storyReply.create({
      data: {
        storyId,
        senderId,
        content: dto.content.trim(),
      },
      include: {
        sender: true,
      },
    });

    if (this.notificationsService && story.authorId !== senderId) {
      void this.notificationsService.createNotification({
        recipientId: story.authorId,
        actorId: senderId,
        type: NotificationType.STORY_REPLY,
        entityId: storyId,
        entityType: 'STORY',
        metadata: {
          previewText: dto.content.slice(0, 80),
          replyId: reply.id,
        },
      });
    }

    return {
      id: reply.id,
      storyId: reply.storyId,
      sender: {
        id: reply.sender.id,
        username: reply.sender.username,
        displayName: reply.sender.displayName || reply.sender.username,
        avatarUrl: reply.sender.avatarUrl,
        isVerified: reply.sender.isVerified,
        isPremium: reply.sender.isPremium,
      },
      content: reply.content,
      createdAt: reply.createdAt.toISOString(),
    };
  }

  /**
   * Get replies for a story (Author only, cursor-paginated)
   */
  async getReplies(
    storyId: string,
    viewerId: string,
    cursor?: string,
    limit = 20,
  ): Promise<StoryRepliesResponseDto> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    this.policy.assertCanViewReplies(story.authorId, viewerId);

    const decoded = this.decodeCursor(cursor);

    const where: any = {
      storyId,
      deletedAt: null,
    };

    if (decoded) {
      where.OR = [
        { createdAt: { lt: new Date(decoded.createdAt) } },
        { createdAt: new Date(decoded.createdAt), id: { lt: decoded.id } },
      ];
    }

    const replies = await this.prisma.storyReply.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        sender: true,
      },
    });

    const hasNextPage = replies.length > limit;
    const pageItems = hasNextPage ? replies.slice(0, limit) : replies;

    const items: StoryReplyItemDto[] = pageItems.map((r) => ({
      id: r.id,
      storyId: r.storyId,
      sender: {
        id: r.sender.id,
        username: r.sender.username,
        displayName: r.sender.displayName || r.sender.username,
        avatarUrl: r.sender.avatarUrl,
        isVerified: r.sender.isVerified,
        isPremium: r.sender.isPremium,
      },
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    }));

    const nextCursor =
      hasNextPage && pageItems.length > 0
        ? this.encodeCursor(
            pageItems[pageItems.length - 1].createdAt,
            pageItems[pageItems.length - 1].id,
          )
        : null;

    return {
      items,
      pageInfo: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  /**
   * Get user's own Story Archive (owner only, cursor-paginated)
   */
  async getArchive(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<StoryArchiveResponseDto> {
    const decoded = this.decodeCursor(cursor);

    const where: any = {
      authorId: userId,
      status: { not: StoryStatus.DELETED },
    };

    if (decoded) {
      where.OR = [
        { createdAt: { lt: new Date(decoded.createdAt) } },
        { createdAt: new Date(decoded.createdAt), id: { lt: decoded.id } },
      ];
    }

    const rawStories = await this.prisma.story.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        author: true,
        mediaObject: true,
        views: { where: { viewerId: userId } },
        reactions: { where: { userId } },
      },
    });

    const hasNextPage = rawStories.length > limit;
    const pageItems = hasNextPage ? rawStories.slice(0, limit) : rawStories;

    const items = await Promise.all(
      pageItems.map((s) => this.formatStoryItem(s, userId, true)),
    );

    const nextCursor =
      hasNextPage && pageItems.length > 0
        ? this.encodeCursor(
            pageItems[pageItems.length - 1].createdAt,
            pageItems[pageItems.length - 1].id,
          )
        : null;

    return {
      items,
      pageInfo: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  /**
   * Delete a story (Author only)
   */
  async deleteStory(
    storyId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    this.policy.assertCanDelete(story.authorId, userId);

    await this.prisma.story.update({
      where: { id: storyId },
      data: {
        status: StoryStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Periodic expiration job
   */
  async expireActiveStoriesBatch(): Promise<number> {
    const now = new Date();
    try {
      const result = await this.prisma.story.updateMany({
        where: {
          status: StoryStatus.ACTIVE,
          expiresAt: { lte: now },
        },
        data: {
          status: StoryStatus.EXPIRED,
        },
      });

      if (result.count > 0) {
        this.logger.log(`Expired ${result.count} active stories`);
      }
      return result.count;
    } catch (err) {
      this.logger.error('Failed to expire active stories', err);
      return 0;
    }
  }
}
