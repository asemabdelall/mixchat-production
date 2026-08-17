import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PostStatus, PostVisibility } from '@prisma/client';

export interface DecodedForYouCursor {
  score: number;
  createdAt: string;
  id: string;
}

export interface CandidateReel {
  id: string;
  authorId: string;
  mediaObjectId: string;
  posterMediaObjectId: string | null;
  caption: string | null;
  audioTitle: string | null;
  locationTag: string | null;
  visibility: PostVisibility;
  status: PostStatus;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  viewsCount: number;
  sharesCount: number;
  durationMs: number | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    isPremium: boolean;
    isPrivate: boolean;
  };
  mediaObject: any;
  posterMediaObject: any;
}

export interface RankedReelItem extends CandidateReel {
  rankingScore: number;
  isFollowing: boolean;
  hasLiked: boolean;
  hasBookmarked: boolean;
}

@Injectable()
export class ReelsRankingService {
  private readonly logger = new Logger(ReelsRankingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encodes a stable For You cursor into base64url string
   */
  encodeCursor(score: number, createdAt: Date, id: string): string {
    const payload: DecodedForYouCursor = {
      score: Math.round(score * 100) / 100,
      createdAt: createdAt.toISOString(),
      id,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /**
   * Safely decodes a For You cursor string
   */
  decodeCursor(cursor?: string): DecodedForYouCursor | null {
    if (!cursor) return null;
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as DecodedForYouCursor;
      if (
        typeof parsed.score !== 'number' ||
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
   * Selects and ranks eligible candidate Reels for a viewer
   */
  async rankForYouCandidates(
    viewerId: string,
    blockedUserIds: Set<string>,
    cursor: DecodedForYouCursor | null,
    limit: number,
  ): Promise<{
    items: RankedReelItem[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    // 1. Get viewer's followed user IDs
    const followingRows = await this.prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const followedSet = new Set<string>(
      followingRows.map((f) => f.followingId),
    );

    // 2. Get viewer's close friend authors (where author added viewer as close friend)
    const closeFriendAuthors = await this.prisma.closeFriend.findMany({
      where: { friendId: viewerId },
      select: { userId: true },
    });
    const closeFriendAuthorSet = new Set<string>(
      closeFriendAuthors.map((c) => c.userId),
    );

    // 3. Get recent watch history to apply recently-watched penalty
    const recentWatchSessions = await this.prisma.reelWatchSession.findMany({
      where: {
        viewerId,
        createdAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // last 48h
        },
      },
      select: { reelId: true, isCompleted: true, watchedMs: true },
    });
    const watchedReelMap = new Map<
      string,
      { isCompleted: boolean; watchedMs: number }
    >();
    for (const w of recentWatchSessions) {
      watchedReelMap.set(w.reelId, {
        isCompleted: w.isCompleted,
        watchedMs: w.watchedMs,
      });
    }

    // 4. Query candidate window (up to 150 active published Reels)
    const blockedArray = Array.from(blockedUserIds);
    const candidates = await this.prisma.reel.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        authorId: blockedArray.length > 0 ? { notIn: blockedArray } : undefined,
        OR: [
          // Public reels from public authors
          {
            visibility: PostVisibility.PUBLIC,
            author: { isPrivate: false },
          },
          // Public/Followers reels from authors the viewer follows
          {
            authorId: { in: Array.from(followedSet) },
            visibility: {
              in: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS],
            },
          },
          // Close friends reels where viewer is in close friends
          {
            authorId: { in: Array.from(closeFriendAuthorSet) },
            visibility: PostVisibility.CLOSE_FRIENDS,
          },
          // Own reels
          { authorId: viewerId },
        ],
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
            isPrivate: true,
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
      take: 120,
    });

    const now = Date.now();

    // 5. Score candidates
    const scoredList: RankedReelItem[] = candidates.map((item) => {
      const ageHours = Math.max(
        0,
        (now - item.createdAt.getTime()) / (1000 * 60 * 60),
      );
      // Freshness score: decays linearly over 48 hours from 100 to 0
      const freshnessScore = Math.max(0, 100 - ageHours * 2.08);

      // Engagement signal: likes, comments, bookmarks, qualified views
      const engagementScore =
        item.likesCount * 3 +
        item.commentsCount * 5 +
        item.bookmarksCount * 4 +
        Math.min(item.viewsCount * 0.5, 100);

      // Social affinity: +30 if author is followed, +40 if close friend
      const isFollowing = followedSet.has(item.authorId);
      const isCloseFriend = closeFriendAuthorSet.has(item.authorId);
      const socialAffinityScore =
        (isFollowing ? 30 : 0) + (isCloseFriend ? 40 : 0);

      // Creator verification boost
      const creatorBoost = item.author.isVerified ? 20 : 0;

      // Watched penalty: -60 if watched in last 48h
      const watchInfo = watchedReelMap.get(item.id);
      const watchedPenalty = watchInfo ? (watchInfo.isCompleted ? 70 : 40) : 0;

      const totalScore =
        freshnessScore +
        engagementScore +
        socialAffinityScore +
        creatorBoost -
        watchedPenalty;

      return {
        ...item,
        rankingScore: Math.round(totalScore * 100) / 100,
        isFollowing: isFollowing || item.authorId === viewerId,
        hasLiked: item.likes.length > 0,
        hasBookmarked: item.bookmarks.length > 0,
      };
    });

    // 6. Sort by rankingScore DESC, createdAt DESC, id DESC
    scoredList.sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) {
        return b.rankingScore - a.rankingScore;
      }
      if (b.createdAt.getTime() !== a.createdAt.getTime()) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return b.id.localeCompare(a.id);
    });

    // 7. Apply author diversity: ensure no more than 2 consecutive reels from same author
    const diversifiedList: RankedReelItem[] = [];
    const remaining = [...scoredList];

    while (remaining.length > 0) {
      let candidateIndex = 0;
      const lastItem = diversifiedList[diversifiedList.length - 1];
      const secondLastItem = diversifiedList[diversifiedList.length - 2];

      if (
        lastItem &&
        secondLastItem &&
        lastItem.authorId === secondLastItem.authorId
      ) {
        // Find first item with different author
        const differentAuthorIndex = remaining.findIndex(
          (r) => r.authorId !== lastItem.authorId,
        );
        if (differentAuthorIndex !== -1) {
          candidateIndex = differentAuthorIndex;
        }
      }

      diversifiedList.push(remaining.splice(candidateIndex, 1)[0]);
    }

    // 8. Apply cursor filter
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = diversifiedList.findIndex(
        (item) => item.id === cursor.id,
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      } else {
        // Fallback: find where score is lower
        const fallbackIndex = diversifiedList.findIndex(
          (item) => item.rankingScore < cursor.score,
        );
        startIndex = fallbackIndex !== -1 ? fallbackIndex : 0;
      }
    }

    const pagedItems = diversifiedList.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < diversifiedList.length;
    const lastItem = pagedItems[pagedItems.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? this.encodeCursor(
            lastItem.rankingScore,
            lastItem.createdAt,
            lastItem.id,
          )
        : null;

    return {
      items: pagedItems,
      nextCursor,
      hasMore,
    };
  }
}
