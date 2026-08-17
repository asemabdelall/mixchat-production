import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MediaService } from '../media/media.service';
import { ReelsPolicyService } from './reels-policy.service';
import { ReelsRankingService } from './reels-ranking.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReelDto } from './dto/create-reel.dto';
import { ReelsQueryDto } from './dto/reels-query.dto';
import {
  ReelItemDto,
  PaginatedReelsResponseDto,
  ReelLikeResponseDto,
  ReelBookmarkResponseDto,
} from './dto/reel-response.dto';
import {
  WatchStartDto,
  WatchProgressDto,
  WatchEndDto,
  WatchTelemetryResponseDto,
} from './dto/watch-telemetry.dto';
import {
  MediaKind,
  MediaStatus,
  NotificationType,
  PostStatus,
  PostVisibility,
} from '@prisma/client';

interface DecodedSimpleCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class ReelsService {
  private readonly logger = new Logger(ReelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly policyService: ReelsPolicyService,
    private readonly rankingService: ReelsRankingService,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Helper to format a simple cursor (createdAt DESC, id DESC)
   */
  private encodeSimpleCursor(createdAt: Date, id: string): string {
    const payload: DecodedSimpleCursor = {
      createdAt: createdAt.toISOString(),
      id,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /**
   * Helper to decode a simple cursor
   */
  private decodeSimpleCursor(cursor?: string): DecodedSimpleCursor | null {
    if (!cursor) return null;
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as DecodedSimpleCursor;
      if (
        !parsed.createdAt ||
        !parsed.id ||
        isNaN(Date.parse(parsed.createdAt))
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Transforms a DB Reel entity + media objects into public ReelItemDto
   */
  private async formatReelItem(
    reel: any,
    viewerId: string,
    isFollowingAuthor?: boolean,
    hasLiked?: boolean,
    hasBookmarked?: boolean,
  ): Promise<ReelItemDto> {
    const videoMediaDto = await this.mediaService.toDto(reel.mediaObject);
    let posterUrl: string | null = null;

    if (reel.posterMediaObject) {
      const posterMediaDto = await this.mediaService.toDto(
        reel.posterMediaObject,
      );
      posterUrl = posterMediaDto.publicUrl || null;
    }

    const isFollowing =
      typeof isFollowingAuthor === 'boolean'
        ? isFollowingAuthor
        : reel.authorId === viewerId
          ? true
          : false;

    const userLiked =
      typeof hasLiked === 'boolean'
        ? hasLiked
        : reel.likes && reel.likes.length > 0;

    const userBookmarked =
      typeof hasBookmarked === 'boolean'
        ? hasBookmarked
        : reel.bookmarks && reel.bookmarks.length > 0;

    return {
      id: reel.id,
      authorId: reel.authorId,
      author: {
        id: reel.author.id,
        username: reel.author.username,
        displayName: reel.author.displayName || reel.author.username,
        avatarUrl: reel.author.avatarUrl,
        isVerified: reel.author.isVerified,
        isPremium: reel.author.isPremium,
        isFollowing,
      },
      video: {
        mediaObjectId: reel.mediaObject.id,
        url: videoMediaDto.publicUrl || '',
        posterUrl,
        mimeType: reel.mediaObject.mimeType,
        width: reel.mediaObject.width,
        height: reel.mediaObject.height,
        durationMs: reel.durationMs || reel.mediaObject.durationMs,
      },
      caption: reel.caption,
      audioTitle: reel.audioTitle,
      locationTag: reel.locationTag,
      visibility: reel.visibility,
      status: reel.status,
      counts: {
        likesCount: Math.max(0, reel.likesCount),
        commentsCount: Math.max(0, reel.commentsCount),
        bookmarksCount: Math.max(0, reel.bookmarksCount),
        viewsCount: Math.max(0, reel.viewsCount),
        sharesCount: Math.max(0, reel.sharesCount),
      },
      viewerState: {
        hasLiked: !!userLiked,
        hasBookmarked: !!userBookmarked,
      },
      createdAt: reel.createdAt.toISOString(),
    };
  }

  /**
   * 1. Create a new Reel referencing a READY video MediaObject
   */
  async createReel(userId: string, dto: CreateReelDto): Promise<ReelItemDto> {
    // Validate video MediaObject
    const videoMedia = await this.prisma.mediaObject.findUnique({
      where: { id: dto.mediaObjectId },
    });

    if (!videoMedia || videoMedia.status === MediaStatus.DELETED) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Video media object not found',
      });
    }

    if (videoMedia.ownerId !== userId) {
      throw new ForbiddenException({
        code: 'MEDIA_NOT_OWNED',
        message: 'You do not own this media object',
      });
    }

    if (videoMedia.status !== MediaStatus.READY) {
      throw new BadRequestException({
        code: 'MEDIA_NOT_READY',
        message: 'Video upload is not complete or READY',
      });
    }

    if (videoMedia.kind !== MediaKind.VIDEO) {
      throw new BadRequestException({
        code: 'MEDIA_KIND_INVALID',
        message: 'Reel media must be of kind VIDEO',
      });
    }

    // Validate optional poster MediaObject
    if (dto.posterMediaObjectId) {
      const posterMedia = await this.prisma.mediaObject.findUnique({
        where: { id: dto.posterMediaObjectId },
      });
      if (
        !posterMedia ||
        posterMedia.ownerId !== userId ||
        posterMedia.status !== MediaStatus.READY ||
        posterMedia.kind !== MediaKind.IMAGE
      ) {
        throw new BadRequestException({
          code: 'POSTER_MEDIA_INVALID',
          message: 'Invalid poster media object',
        });
      }
    }

    const caption = dto.caption ? dto.caption.trim() : null;
    const audioTitle = dto.audioTitle ? dto.audioTitle.trim() : null;
    const locationTag = dto.locationTag ? dto.locationTag.trim() : null;
    const visibility = dto.visibility || PostVisibility.PUBLIC;

    const createdReel = await this.prisma.$transaction(async (tx) => {
      const reel = await tx.reel.create({
        data: {
          authorId: userId,
          mediaObjectId: dto.mediaObjectId,
          posterMediaObjectId: dto.posterMediaObjectId || null,
          caption,
          audioTitle,
          locationTag,
          visibility,
          status: PostStatus.PUBLISHED,
          durationMs: videoMedia.durationMs || null,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
              isPremium: true,
            },
          },
          mediaObject: true,
          posterMediaObject: true,
        },
      });

      return reel;
    });

    return await this.formatReelItem(createdReel, userId, true, false, false);
  }

  /**
   * 2. Get Reels Feed (For You or Following)
   */
  async getReelsFeed(
    viewerId: string,
    query: ReelsQueryDto,
  ): Promise<PaginatedReelsResponseDto> {
    const limit = query.limit || 10;
    const blockedUserIds = await this.policyService.getBlockedUserIds(viewerId);

    if (query.feed === 'following') {
      return await this.getFollowingFeed(
        viewerId,
        blockedUserIds,
        query.cursor,
        limit,
      );
    }

    // Default: For You feed using deterministic ranking service
    const decodedCursor = this.rankingService.decodeCursor(query.cursor);
    const rankedResult = await this.rankingService.rankForYouCandidates(
      viewerId,
      blockedUserIds,
      decodedCursor,
      limit,
    );

    const formattedItems: ReelItemDto[] = [];
    for (const r of rankedResult.items) {
      formattedItems.push(
        await this.formatReelItem(
          r,
          viewerId,
          r.isFollowing,
          r.hasLiked,
          r.hasBookmarked,
        ),
      );
    }

    return {
      items: formattedItems,
      nextCursor: rankedResult.nextCursor,
      hasMore: rankedResult.hasMore,
    };
  }

  /**
   * Helper for Following feed
   */
  private async getFollowingFeed(
    viewerId: string,
    blockedUserIds: Set<string>,
    cursorString: string | undefined,
    limit: number,
  ): Promise<PaginatedReelsResponseDto> {
    const followingRows = await this.prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const followedIds = followingRows
      .map((f) => f.followingId)
      .filter((id) => !blockedUserIds.has(id));

    if (followedIds.length === 0) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const decodedCursor = this.decodeSimpleCursor(cursorString);
    const cursorFilter = decodedCursor
      ? {
          OR: [
            { createdAt: { lt: new Date(decodedCursor.createdAt) } },
            {
              createdAt: new Date(decodedCursor.createdAt),
              id: { lt: decodedCursor.id },
            },
          ],
        }
      : {};

    const rawReels = await this.prisma.reel.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        authorId: { in: followedIds },
        visibility: { in: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS] },
        ...cursorFilter,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            isPremium: true,
          },
        },
        mediaObject: true,
        posterMediaObject: true,
        likes: {
          where: { userId: viewerId },
          select: { id: true },
        },
        bookmarks: {
          where: { userId: viewerId },
          select: { id: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rawReels.length > limit;
    const itemsToReturn = hasMore ? rawReels.slice(0, limit) : rawReels;

    const formattedItems: ReelItemDto[] = [];
    for (const r of itemsToReturn) {
      formattedItems.push(
        await this.formatReelItem(
          r,
          viewerId,
          true,
          r.likes.length > 0,
          r.bookmarks.length > 0,
        ),
      );
    }

    const lastItem = itemsToReturn[itemsToReturn.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? this.encodeSimpleCursor(lastItem.createdAt, lastItem.id)
        : null;

    return {
      items: formattedItems,
      nextCursor,
      hasMore,
    };
  }

  /**
   * 3. Get Reels for a specific user profile
   */
  async getUserReels(
    viewerId: string,
    username: string,
    query: ReelsQueryDto,
  ): Promise<PaginatedReelsResponseDto> {
    const author = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isPrivate: true,
        isVerified: true,
        isPremium: true,
      },
    });

    if (!author) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `User @${username} not found`,
      });
    }

    const isSelf = author.id === viewerId;

    // Check block
    if (!isSelf) {
      const blocked = await this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: author.id },
            { blockerId: author.id, blockedId: viewerId },
          ],
        },
      });
      if (blocked) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        });
      }
    }

    // Check relationship
    let isFollowing = false;
    let isCloseFriend = false;

    if (!isSelf) {
      const [follow, closeFriend] = await Promise.all([
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: author.id,
            },
          },
        }),
        this.prisma.closeFriend.findUnique({
          where: {
            userId_friendId: {
              userId: author.id,
              friendId: viewerId,
            },
          },
        }),
      ]);
      isFollowing = !!follow;
      isCloseFriend = !!closeFriend;

      if (author.isPrivate && !isFollowing) {
        return { items: [], nextCursor: null, hasMore: false };
      }
    }

    const allowedVisibilities: PostVisibility[] = [PostVisibility.PUBLIC];
    if (isSelf || isFollowing) {
      allowedVisibilities.push(PostVisibility.FOLLOWERS);
    }
    if (isSelf || isCloseFriend) {
      allowedVisibilities.push(PostVisibility.CLOSE_FRIENDS);
    }

    const limit = query.limit || 12;
    const decodedCursor = this.decodeSimpleCursor(query.cursor);
    const cursorFilter = decodedCursor
      ? {
          OR: [
            { createdAt: { lt: new Date(decodedCursor.createdAt) } },
            {
              createdAt: new Date(decodedCursor.createdAt),
              id: { lt: decodedCursor.id },
            },
          ],
        }
      : {};

    const rawReels = await this.prisma.reel.findMany({
      where: {
        authorId: author.id,
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        visibility: isSelf ? undefined : { in: allowedVisibilities },
        ...cursorFilter,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            isPremium: true,
          },
        },
        mediaObject: true,
        posterMediaObject: true,
        likes: {
          where: { userId: viewerId },
          select: { id: true },
        },
        bookmarks: {
          where: { userId: viewerId },
          select: { id: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rawReels.length > limit;
    const itemsToReturn = hasMore ? rawReels.slice(0, limit) : rawReels;

    const formattedItems: ReelItemDto[] = [];
    for (const r of itemsToReturn) {
      formattedItems.push(
        await this.formatReelItem(
          r,
          viewerId,
          isFollowing || isSelf,
          r.likes.length > 0,
          r.bookmarks.length > 0,
        ),
      );
    }

    const lastItem = itemsToReturn[itemsToReturn.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? this.encodeSimpleCursor(lastItem.createdAt, lastItem.id)
        : null;

    return {
      items: formattedItems,
      nextCursor,
      hasMore,
    };
  }

  /**
   * 4. Get a single Reel by ID
   */
  async getReelById(viewerId: string, id: string): Promise<ReelItemDto> {
    await this.policyService.assertCanAccessReel(viewerId, id);

    const reel = await this.prisma.reel.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            isPremium: true,
          },
        },
        mediaObject: true,
        posterMediaObject: true,
        likes: {
          where: { userId: viewerId },
          select: { id: true },
        },
        bookmarks: {
          where: { userId: viewerId },
          select: { id: true },
        },
      },
    });

    if (!reel || reel.status === PostStatus.DELETED || reel.deletedAt) {
      throw new NotFoundException({
        code: 'REEL_NOT_FOUND',
        message: 'Reel not found',
      });
    }

    const isFollowing =
      viewerId === reel.authorId
        ? true
        : !!(await this.prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId,
                followingId: reel.authorId,
              },
            },
          }));

    return await this.formatReelItem(
      reel,
      viewerId,
      isFollowing,
      reel.likes.length > 0,
      reel.bookmarks.length > 0,
    );
  }

  /**
   * 5. Delete a Reel (Author only)
   */
  async deleteReel(
    userId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const reel = await this.prisma.reel.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true },
    });

    if (!reel || reel.status === PostStatus.DELETED) {
      throw new NotFoundException({
        code: 'REEL_NOT_FOUND',
        message: 'Reel not found',
      });
    }

    this.policyService.assertCanDelete(userId, reel);

    await this.prisma.reel.update({
      where: { id },
      data: {
        status: PostStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    return { success: true, message: 'Reel deleted successfully' };
  }

  /**
   * 6. Like a Reel (Idempotent)
   */
  async likeReel(userId: string, id: string): Promise<ReelLikeResponseDto> {
    await this.policyService.assertCanAccessReel(userId, id);

    const existingLike = await this.prisma.reelLike.findUnique({
      where: {
        userId_reelId: {
          userId,
          reelId: id,
        },
      },
    });

    if (existingLike) {
      const reel = await this.prisma.reel.findUnique({
        where: { id },
        select: { likesCount: true },
      });
      return { liked: true, likesCount: reel?.likesCount || 0 };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.reelLike.create({
        data: {
          userId,
          reelId: id,
        },
      });

      return await tx.reel.update({
        where: { id },
        data: {
          likesCount: { increment: 1 },
        },
        select: { likesCount: true, authorId: true },
      });
    });

    if (this.notificationsService && updated.authorId !== userId) {
      void this.notificationsService.createNotification({
        recipientId: updated.authorId,
        actorId: userId,
        type: NotificationType.REEL_LIKE,
        entityId: id,
        entityType: 'REEL',
      });
    }

    return { liked: true, likesCount: updated.likesCount };
  }

  /**
   * 7. Unlike a Reel (Idempotent)
   */
  async unlikeReel(userId: string, id: string): Promise<ReelLikeResponseDto> {
    await this.policyService.assertCanAccessReel(userId, id);

    const existingLike = await this.prisma.reelLike.findUnique({
      where: {
        userId_reelId: {
          userId,
          reelId: id,
        },
      },
    });

    if (!existingLike) {
      const reel = await this.prisma.reel.findUnique({
        where: { id },
        select: { likesCount: true },
      });
      return { liked: false, likesCount: Math.max(0, reel?.likesCount || 0) };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.reelLike.delete({
        where: {
          userId_reelId: {
            userId,
            reelId: id,
          },
        },
      });

      return await tx.reel.update({
        where: { id },
        data: {
          likesCount: { decrement: 1 },
        },
        select: { likesCount: true },
      });
    });

    return { liked: false, likesCount: Math.max(0, updated.likesCount) };
  }

  /**
   * 8. Bookmark a Reel (Idempotent)
   */
  async bookmarkReel(
    userId: string,
    id: string,
  ): Promise<ReelBookmarkResponseDto> {
    await this.policyService.assertCanAccessReel(userId, id);

    const existingBookmark = await this.prisma.reelBookmark.findUnique({
      where: {
        userId_reelId: {
          userId,
          reelId: id,
        },
      },
    });

    if (existingBookmark) {
      const reel = await this.prisma.reel.findUnique({
        where: { id },
        select: { bookmarksCount: true },
      });
      return { bookmarked: true, bookmarksCount: reel?.bookmarksCount || 0 };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.reelBookmark.create({
        data: {
          userId,
          reelId: id,
        },
      });

      return await tx.reel.update({
        where: { id },
        data: {
          bookmarksCount: { increment: 1 },
        },
        select: { bookmarksCount: true },
      });
    });

    return { bookmarked: true, bookmarksCount: updated.bookmarksCount };
  }

  /**
   * 9. Unbookmark a Reel (Idempotent)
   */
  async unbookmarkReel(
    userId: string,
    id: string,
  ): Promise<ReelBookmarkResponseDto> {
    await this.policyService.assertCanAccessReel(userId, id);

    const existingBookmark = await this.prisma.reelBookmark.findUnique({
      where: {
        userId_reelId: {
          userId,
          reelId: id,
        },
      },
    });

    if (!existingBookmark) {
      const reel = await this.prisma.reel.findUnique({
        where: { id },
        select: { bookmarksCount: true },
      });
      return {
        bookmarked: false,
        bookmarksCount: Math.max(0, reel?.bookmarksCount || 0),
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.reelBookmark.delete({
        where: {
          userId_reelId: {
            userId,
            reelId: id,
          },
        },
      });

      return await tx.reel.update({
        where: { id },
        data: {
          bookmarksCount: { decrement: 1 },
        },
        select: { bookmarksCount: true },
      });
    });

    return {
      bookmarked: false,
      bookmarksCount: Math.max(0, updated.bookmarksCount),
    };
  }

  /**
   * 10. Watch Telemetry: Start Session
   */
  async recordWatchStart(
    viewerId: string,
    reelId: string,
    dto: WatchStartDto,
  ): Promise<WatchTelemetryResponseDto> {
    await this.policyService.assertCanAccessReel(viewerId, reelId);

    const existing = await this.prisma.reelWatchSession.findUnique({
      where: {
        viewerId_sessionId: {
          viewerId,
          sessionId: dto.sessionId,
        },
      },
    });

    if (!existing) {
      await this.prisma.reelWatchSession.create({
        data: {
          reelId,
          viewerId,
          sessionId: dto.sessionId,
          startedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      isQualifiedView: existing?.isQualifiedView || false,
      isCompleted: existing?.isCompleted || false,
    };
  }

  /**
   * 11. Watch Telemetry: Update Progress & Checkpoint
   */
  async recordWatchProgress(
    viewerId: string,
    reelId: string,
    dto: WatchProgressDto,
  ): Promise<WatchTelemetryResponseDto> {
    await this.policyService.assertCanAccessReel(viewerId, reelId);

    const session = await this.prisma.reelWatchSession.findUnique({
      where: {
        viewerId_sessionId: {
          viewerId,
          sessionId: dto.sessionId,
        },
      },
    });

    const watchedMs = Math.min(dto.watchedMs, 3600000);
    const maxProgressMs = dto.maxProgressMs || 0;
    const durationMs = dto.durationMs || session?.durationMs || 0;
    const completionRatio = Math.min(
      1.0,
      Math.max(
        0,
        dto.completionRatio ||
          (durationMs > 0 ? maxProgressMs / durationMs : 0),
      ),
    );
    const replayCount = dto.replayCount || 0;

    // View qualification definition: >= 2000ms watched OR completionRatio >= 0.5 (for short clips)
    const isNowQualified = watchedMs >= 2000 || completionRatio >= 0.5;
    const isCompleted = completionRatio >= 0.9;

    let shouldIncrementViewCount = false;

    if (session) {
      if (isNowQualified && !session.isQualifiedView) {
        shouldIncrementViewCount = true;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.reelWatchSession.update({
          where: { id: session.id },
          data: {
            watchedMs: Math.max(session.watchedMs, watchedMs),
            maxProgressMs: Math.max(session.maxProgressMs, maxProgressMs),
            durationMs: durationMs || session.durationMs,
            completionRatio: Math.max(session.completionRatio, completionRatio),
            isQualifiedView: session.isQualifiedView || isNowQualified,
            isCompleted: session.isCompleted || isCompleted,
            replayCount: Math.max(session.replayCount, replayCount),
          },
        });

        if (shouldIncrementViewCount) {
          await tx.reel.update({
            where: { id: reelId },
            data: { viewsCount: { increment: 1 } },
          });
        }
      });
    } else {
      // First session creation directly on progress
      shouldIncrementViewCount = isNowQualified;

      await this.prisma.$transaction(async (tx) => {
        await tx.reelWatchSession.create({
          data: {
            reelId,
            viewerId,
            sessionId: dto.sessionId,
            watchedMs,
            maxProgressMs,
            durationMs,
            completionRatio,
            isQualifiedView: isNowQualified,
            isCompleted,
            replayCount,
          },
        });

        if (shouldIncrementViewCount) {
          await tx.reel.update({
            where: { id: reelId },
            data: { viewsCount: { increment: 1 } },
          });
        }
      });
    }

    return {
      success: true,
      isQualifiedView: isNowQualified || session?.isQualifiedView || false,
      isCompleted: isCompleted || session?.isCompleted || false,
    };
  }

  /**
   * 12. Watch Telemetry: End Session
   */
  async recordWatchEnd(
    viewerId: string,
    reelId: string,
    dto: WatchEndDto,
  ): Promise<WatchTelemetryResponseDto> {
    const progressRes = await this.recordWatchProgress(viewerId, reelId, dto);

    await this.prisma.reelWatchSession.updateMany({
      where: {
        viewerId,
        sessionId: dto.sessionId,
      },
      data: {
        endedAt: new Date(),
        isCompleted: dto.isCompleted || progressRes.isCompleted,
      },
    });

    return {
      success: true,
      isQualifiedView: progressRes.isQualifiedView,
      isCompleted: dto.isCompleted || progressRes.isCompleted,
    };
  }
}
