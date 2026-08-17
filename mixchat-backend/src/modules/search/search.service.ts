import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { MediaService } from '../media/media.service';
import { SocialPolicyService } from '../social/social-policy.service';
import { PostsPolicyService } from '../posts/posts-policy.service';
import {
  SearchType,
  UniversalSearchQueryDto,
  ExploreQueryDto,
} from './dto/search-query.dto';
import {
  UniversalSearchResponseDto,
  ExploreFeedResponseDto,
  SearchMediaItemDto,
} from './dto/search-response.dto';
import {
  TrendingResponseDto,
  TrendingTagDto,
} from './dto/trending-response.dto';
import { PublicProfileDto } from '../users/dto/user-profile.dto';
import {
  PostFeedItemDto,
  PostMediaItemDto,
} from '../posts/dto/post-response.dto';
import { PostStatus, PostVisibility, RelationshipState } from '@prisma/client';

interface DecodedCursor {
  createdAt: string;
  id: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly TRENDING_CACHE_KEY = 'mixchat:search:trending';
  private readonly TRENDING_TTL_SECONDS = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mediaService: MediaService,
    private readonly socialPolicy: SocialPolicyService,
    private readonly postsPolicy: PostsPolicyService,
  ) {}

  private encodeCursor(createdAt: Date, id: string): string {
    const payload: DecodedCursor = {
      createdAt: createdAt.toISOString(),
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
   * Centralized search query normalizer
   */
  public normalizeSearchQuery(raw?: string): {
    query: string;
    cleanText: string;
    isUsernameIntent: boolean;
    isHashtagIntent: boolean;
  } {
    if (!raw) {
      return {
        query: '',
        cleanText: '',
        isUsernameIntent: false,
        isHashtagIntent: false,
      };
    }
    const trimmed = raw
      .trim()
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .slice(0, 100);
    const isUsernameIntent = trimmed.startsWith('@');
    const isHashtagIntent = trimmed.startsWith('#');
    const cleanText = trimmed.replace(/^[@#]/, '').trim().toLowerCase();

    return {
      query: trimmed,
      cleanText,
      isUsernameIntent,
      isHashtagIntent,
    };
  }

  /**
   * Universal multi-tab search engine
   */
  async universalSearch(
    dto: UniversalSearchQueryDto,
    viewerId?: string,
  ): Promise<UniversalSearchResponseDto> {
    const { query, cleanText, isUsernameIntent, isHashtagIntent } =
      this.normalizeSearchQuery(dto.q);
    const requestedType = dto.type || SearchType.ALL;
    const limit = Math.min(Math.max(dto.limit || 20, 1), 50);

    // Auto-detect intent if type is 'all'
    let effectiveType = requestedType;
    if (requestedType === SearchType.ALL) {
      if (isUsernameIntent) {
        effectiveType = SearchType.USERS;
      } else if (isHashtagIntent) {
        effectiveType = SearchType.TAGS;
      }
    }

    let users: PublicProfileDto[] = [];
    let posts: PostFeedItemDto[] = [];
    let tags: TrendingTagDto[] = [];
    let media: SearchMediaItemDto[] = [];
    let nextCursor: string | null = null;
    let hasNextPage = false;

    if (cleanText.length > 0) {
      // 1. Save recent search if viewer is authenticated
      if (viewerId) {
        void this.addRecentSearch(viewerId, query);
      }

      // 2. Execute parallel search based on requested type
      const tasks: Promise<void>[] = [];

      if (
        effectiveType === SearchType.ALL ||
        effectiveType === SearchType.USERS
      ) {
        tasks.push(
          (async () => {
            users = await this.searchUsers(cleanText, viewerId, limit);
          })(),
        );
      }

      if (
        effectiveType === SearchType.ALL ||
        effectiveType === SearchType.POSTS
      ) {
        tasks.push(
          (async () => {
            const res = await this.searchPosts(
              query,
              viewerId,
              dto.cursor,
              limit,
            );
            posts = res.items;
            nextCursor = res.nextCursor;
            hasNextPage = res.hasNextPage;
          })(),
        );
      }

      if (
        effectiveType === SearchType.ALL ||
        effectiveType === SearchType.TAGS
      ) {
        tasks.push(
          (async () => {
            tags = await this.searchHashtags(cleanText, limit);
          })(),
        );
      }

      if (
        effectiveType === SearchType.ALL ||
        effectiveType === SearchType.MEDIA
      ) {
        tasks.push(
          (async () => {
            media = await this.searchMedia(query, viewerId, limit);
          })(),
        );
      }

      await Promise.all(tasks);
    }

    return {
      query,
      type: requestedType,
      users,
      posts,
      tags,
      media,
      pageInfo: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  /**
   * Smart user search ranking with dominant exact match boost and affinity weighting
   */
  async searchUsers(
    query: string,
    viewerId?: string,
    limit = 20,
  ): Promise<PublicProfileDto[]> {
    const { cleanText: cleanQ } = this.normalizeSearchQuery(query);
    if (!cleanQ) return [];

    // 1. Get blocked user IDs to exclude
    let excludedUserIds: string[] = [];
    if (viewerId) {
      const blocks = await this.prisma.block.findMany({
        where: {
          OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
        },
        select: { blockerId: true, blockedId: true },
      });
      excludedUserIds = Array.from(
        new Set(
          blocks.map((b) =>
            b.blockerId === viewerId ? b.blockedId : b.blockerId,
          ),
        ),
      );
    }

    // 2. Fetch candidates from PostgreSQL
    const candidates = await this.prisma.user.findMany({
      where: {
        id: { notIn: excludedUserIds },
        OR: [
          { username: { contains: cleanQ, mode: 'insensitive' } },
          { displayName: { contains: cleanQ, mode: 'insensitive' } },
          { bio: { contains: cleanQ, mode: 'insensitive' } },
        ],
      },
      take: Math.min(limit * 3, 60),
      include: {
        followers: viewerId ? { where: { followerId: viewerId } } : false,
        following: viewerId ? { where: { followingId: viewerId } } : false,
        sentFollowRequests: viewerId
          ? { where: { targetId: viewerId } }
          : false,
        receivedFollowRequests: viewerId
          ? { where: { requesterId: viewerId } }
          : false,
      },
    });

    // 3. Score & Rank candidates: relevance strictly dominates popularity
    const scored = candidates.map((user) => {
      const uLower = user.username.toLowerCase();
      const dLower = (user.displayName || '').toLowerCase();

      let score = 0;
      // Dominant exact username match boost (+500) so no combination of badges can beat exact username
      if (uLower === cleanQ) score += 500;
      else if (uLower.startsWith(cleanQ)) score += 150;
      else if (uLower.includes(cleanQ)) score += 40;

      // Display name relevance
      if (dLower === cleanQ) score += 90;
      else if (dLower.startsWith(cleanQ)) score += 60;
      else if (dLower.includes(cleanQ)) score += 20;

      // Social affinity & relationship state
      let relationshipState: RelationshipState = RelationshipState.NONE;
      if (viewerId) {
        if (viewerId === user.id) {
          relationshipState = RelationshipState.SELF;
        } else {
          const isFollowing = user.followers && user.followers.length > 0;
          const isFollowedBy = user.following && user.following.length > 0;
          const hasPendingSent =
            user.receivedFollowRequests &&
            user.receivedFollowRequests.length > 0;

          if (isFollowing && isFollowedBy) {
            relationshipState = RelationshipState.MUTUAL;
            score += 40;
          } else if (isFollowing) {
            relationshipState = RelationshipState.FOLLOWING;
            score += 30;
          } else if (hasPendingSent) {
            relationshipState = RelationshipState.REQUESTED;
            score += 10;
          } else if (isFollowedBy) {
            relationshipState = RelationshipState.FOLLOWED_BY;
            score += 15;
          }
        }
      }

      // Quality & verification boosts (bounded)
      if (user.isVerified) score += 20;
      if (user.isPremium) score += 10;
      score += Math.min(25, Math.log10(user.followersCount + 1) * 8);

      const dto: PublicProfileDto = {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl,
        website: user.website,
        locationCity: user.locationCity,
        isPrivate: user.isPrivate,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        relationshipState,
        isCloseFriend: false,
        createdAt: user.createdAt.toISOString(),
      };

      return { dto, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.dto);
  }

  /**
   * Search posts by keyword or hashtag
   */
  async searchPosts(
    query: string,
    viewerId?: string,
    cursor?: string,
    limit = 20,
  ): Promise<{
    items: PostFeedItemDto[];
    nextCursor: string | null;
    hasNextPage: boolean;
  }> {
    const cleanQ = query.trim();
    if (!cleanQ) return { items: [], nextCursor: null, hasNextPage: false };

    const decoded = this.decodeCursor(cursor);

    // Block exclusions
    let excludedAuthorIds: string[] = [];
    if (viewerId) {
      const blocks = await this.prisma.block.findMany({
        where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
        select: { blockerId: true, blockedId: true },
      });
      excludedAuthorIds = Array.from(
        new Set(
          blocks.map((b) =>
            b.blockerId === viewerId ? b.blockedId : b.blockerId,
          ),
        ),
      );
    }

    const where: any = {
      status: PostStatus.PUBLISHED,
      authorId: { notIn: excludedAuthorIds },
      OR: [
        { content: { contains: cleanQ, mode: 'insensitive' } },
        { locationTag: { contains: cleanQ, mode: 'insensitive' } },
      ],
    };

    if (decoded) {
      where.OR = [
        {
          createdAt: { lt: new Date(decoded.createdAt) },
          status: PostStatus.PUBLISHED,
          authorId: { notIn: excludedAuthorIds },
          OR: [
            { content: { contains: cleanQ, mode: 'insensitive' } },
            { locationTag: { contains: cleanQ, mode: 'insensitive' } },
          ],
        },
        {
          createdAt: new Date(decoded.createdAt),
          id: { lt: decoded.id },
          status: PostStatus.PUBLISHED,
          authorId: { notIn: excludedAuthorIds },
          OR: [
            { content: { contains: cleanQ, mode: 'insensitive' } },
            { locationTag: { contains: cleanQ, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const rawPosts = await this.prisma.post.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
        media: {
          orderBy: { position: 'asc' },
          include: { mediaObject: true },
        },
        likes: viewerId ? { where: { userId: viewerId } } : false,
        bookmarks: viewerId ? { where: { userId: viewerId } } : false,
        reposts: viewerId ? { where: { userId: viewerId } } : false,
      },
    });

    const hasNextPage = rawPosts.length > limit;
    const pageItems = hasNextPage ? rawPosts.slice(0, limit) : rawPosts;

    const items: PostFeedItemDto[] = await Promise.all(
      pageItems.map(async (post) => {
        const hasLiked = post.likes && post.likes.length > 0;
        const hasBookmarked = post.bookmarks && post.bookmarks.length > 0;
        const hasReposted = post.reposts && post.reposts.length > 0;

        const mediaItems: PostMediaItemDto[] = await Promise.all(
          (post.media || []).map(async (m) => {
            const mediaDto = await this.mediaService.toDto(m.mediaObject);
            return {
              id: m.mediaObject.id,
              url: mediaDto.publicUrl || '',
              kind: m.mediaObject.kind,
              mimeType: m.mediaObject.mimeType,
              width: m.mediaObject.width,
              height: m.mediaObject.height,
              durationMs: m.mediaObject.durationMs,
              position: m.position,
            };
          }),
        );

        return {
          id: post.id,
          content: post.content || '',
          visibility: post.visibility,
          locationTag: post.locationTag,
          stats: {
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            repostsCount: post.repostsCount,
          },
          viewer: {
            hasLiked: !!hasLiked,
            hasBookmarked: !!hasBookmarked,
            hasReposted: !!hasReposted,
          },
          author: {
            id: post.author.id,
            username: post.author.username,
            displayName: post.author.displayName || post.author.username,
            avatarUrl: post.author.avatarUrl,
            isVerified: post.author.isVerified,
            isPremium: post.author.isPremium,
          },
          media: mediaItems,
          editedAt: post.editedAt?.toISOString() ?? null,
          createdAt: post.createdAt.toISOString(),
        };
      }),
    );

    const nextCursor =
      hasNextPage && pageItems.length > 0
        ? this.encodeCursor(
            pageItems[pageItems.length - 1].createdAt,
            pageItems[pageItems.length - 1].id,
          )
        : null;

    return { items, nextCursor, hasNextPage };
  }

  /**
   * Search and aggregate real hashtags
   */
  async searchHashtags(query: string, limit = 20): Promise<TrendingTagDto[]> {
    const cleanTag = query.replace(/^#/, '').toLowerCase().trim();
    if (!cleanTag) return [];

    // Query active posts containing the hashtag
    const postsWithTag = await this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        content: { contains: `#${cleanTag}`, mode: 'insensitive' },
      },
      select: {
        content: true,
        createdAt: true,
        likesCount: true,
        commentsCount: true,
      },
      take: 100,
    });

    const tagMap = new Map<
      string,
      { count: number; recentCount: number; score: number }
    >();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    postsWithTag.forEach((p) => {
      if (!p.content) return;
      const matches = p.content.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g);
      if (!matches) return;

      matches.forEach((t) => {
        const lower = t.toLowerCase();
        if (lower.includes(cleanTag)) {
          const existing = tagMap.get(lower) || {
            count: 0,
            recentCount: 0,
            score: 0,
          };
          existing.count += 1;
          if (p.createdAt >= oneDayAgo) {
            existing.recentCount += 1;
          }
          existing.score += (p.likesCount || 0) + (p.commentsCount || 0) * 2;
          tagMap.set(lower, existing);
        }
      });
    });

    const result: TrendingTagDto[] = [];
    tagMap.forEach((val, tag) => {
      result.push({
        tag,
        postsCount: val.count,
        category: this.categorizeTag(tag),
        velocityScore: val.recentCount * 3 + val.count,
      });
    });

    result.sort((a, b) => b.velocityScore - a.velocityScore);
    return result.slice(0, limit);
  }

  /**
   * Discovers media objects from active posts
   */
  async searchMedia(
    query: string,
    viewerId?: string,
    limit = 20,
  ): Promise<SearchMediaItemDto[]> {
    const cleanQ = query.trim();
    if (!cleanQ) return [];

    const { items: posts } = await this.searchPosts(
      cleanQ,
      viewerId,
      undefined,
      limit * 2,
    );

    const mediaList: SearchMediaItemDto[] = [];
    posts.forEach((p) => {
      (p.media || []).forEach((m) => {
        mediaList.push({
          id: m.id,
          url: m.url,
          mimeType: m.mimeType,
          kind: m.kind,
          postId: p.id,
          likesCount: p.stats.likesCount,
          commentsCount: p.stats.commentsCount,
        });
      });
    });

    return mediaList.slice(0, limit);
  }

  /**
   * Real dynamic trending engine with Redis caching
   */
  async getTrendingTopics(): Promise<TrendingResponseDto> {
    // 1. Try Redis cache
    try {
      const cached = await this.redis.get(this.TRENDING_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as TrendingResponseDto;
      }
    } catch {
      // Continue to DB calculation
    }

    // 2. Calculate dynamic trending from past 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const activePosts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        content: true,
        createdAt: true,
        likesCount: true,
        commentsCount: true,
      },
      take: 500,
    });

    const tagFrequency = new Map<
      string,
      { count7d: number; count24h: number; interactions: number }
    >();

    activePosts.forEach((p) => {
      if (!p.content) return;
      const matches = p.content.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g);
      if (!matches) return;

      matches.forEach((tag) => {
        const lower = tag.toLowerCase();
        const existing = tagFrequency.get(lower) || {
          count7d: 0,
          count24h: 0,
          interactions: 0,
        };
        existing.count7d += 1;
        if (p.createdAt >= oneDayAgo) {
          existing.count24h += 1;
        }
        existing.interactions +=
          (p.likesCount || 0) + (p.commentsCount || 0) * 2;
        tagFrequency.set(lower, existing);
      });
    });

    // Default trending fallback if database is fresh
    if (tagFrequency.size === 0) {
      const defaults = [
        '#MixChat',
        '#Design',
        '#Cyberpunk',
        '#NextGen',
        '#Tech',
      ];
      defaults.forEach((t, idx) => {
        tagFrequency.set(t, {
          count7d: 10 - idx,
          count24h: 5 - idx,
          interactions: 50 - idx * 5,
        });
      });
    }

    const items: TrendingTagDto[] = [];
    tagFrequency.forEach((stats, tag) => {
      const velocityScore =
        stats.count24h * 3 + stats.count7d * 1 + stats.interactions * 0.2;
      items.push({
        tag,
        postsCount: stats.count7d,
        category: this.categorizeTag(tag),
        velocityScore: Math.round(velocityScore * 10) / 10,
      });
    });

    items.sort((a, b) => b.velocityScore - a.velocityScore);
    const topItems = items.slice(0, 10);

    const response: TrendingResponseDto = {
      items: topItems,
      updatedAt: new Date().toISOString(),
    };

    // Cache in Redis
    try {
      await this.redis.set(
        this.TRENDING_CACHE_KEY,
        JSON.stringify(response),
        this.TRENDING_TTL_SECONDS,
      );
    } catch {
      // Non-fatal
    }

    return response;
  }

  /**
   * Algorithmic explore feed for visual discovery with freshness decay and creator diversity
   */
  async getExploreFeed(
    viewerId?: string,
    dto?: ExploreQueryDto,
  ): Promise<ExploreFeedResponseDto> {
    const limit = Math.min(Math.max(dto?.limit || 20, 1), 50);
    const decoded = this.decodeCursor(dto?.cursor);

    let excludedAuthorIds: string[] = [];
    if (viewerId) {
      const blocks = await this.prisma.block.findMany({
        where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
        select: { blockerId: true, blockedId: true },
      });
      excludedAuthorIds = Array.from(
        new Set(
          blocks.map((b) =>
            b.blockerId === viewerId ? b.blockedId : b.blockerId,
          ),
        ),
      );
    }

    const where: any = {
      status: PostStatus.PUBLISHED,
      visibility: PostVisibility.PUBLIC,
      authorId: { notIn: excludedAuthorIds },
      media: { some: {} }, // Has at least 1 media item
    };

    if (decoded) {
      where.OR = [
        {
          createdAt: { lt: new Date(decoded.createdAt) },
          status: PostStatus.PUBLISHED,
          visibility: PostVisibility.PUBLIC,
          authorId: { notIn: excludedAuthorIds },
          media: { some: {} },
        },
        {
          createdAt: new Date(decoded.createdAt),
          id: { lt: decoded.id },
          status: PostStatus.PUBLISHED,
          visibility: PostVisibility.PUBLIC,
          authorId: { notIn: excludedAuthorIds },
          media: { some: {} },
        },
      ];
    }

    // Fetch candidate pool for algorithmic ranking
    const candidateLimit = decoded ? limit + 1 : Math.min(limit * 3, 60);
    const rawPosts = await this.prisma.post.findMany({
      where,
      take: candidateLimit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
        media: {
          orderBy: { position: 'asc' },
          include: { mediaObject: true },
        },
        likes: viewerId ? { where: { userId: viewerId } } : false,
        bookmarks: viewerId ? { where: { userId: viewerId } } : false,
        reposts: viewerId ? { where: { userId: viewerId } } : false,
      },
    });

    // Score candidates with freshness decay & engagement velocity
    const now = Date.now();
    const scored = rawPosts.map((post) => {
      const hoursOld = Math.max(
        0,
        (now - post.createdAt.getTime()) / (1000 * 60 * 60),
      );
      const rawEngagement =
        post.likesCount * 2 +
        post.commentsCount * 3 +
        post.repostsCount * 4 +
        post.bookmarksCount * 2 +
        1;
      const timeDecay = Math.pow(hoursOld + 2, 1.15);
      let score = (rawEngagement * 100) / timeDecay;

      if (post.author.isVerified) score *= 1.15;
      if (post.author.isPremium) score *= 1.08;
      if (hoursOld <= 24) {
        score += Math.max(0, (24 - hoursOld) * 4);
      }

      return { post, score };
    });

    // Sort by algorithmic score
    scored.sort((a, b) => b.score - a.score);

    // Apply creator diversity filter: max 2 consecutive posts from same author
    const diversified: typeof rawPosts = [];
    let lastAuthorId: string | null = null;
    let consecutiveCount = 0;
    const remaining: typeof rawPosts = [];

    for (const item of scored) {
      if (item.post.author.id === lastAuthorId) {
        consecutiveCount++;
      } else {
        lastAuthorId = item.post.author.id;
        consecutiveCount = 1;
      }

      if (consecutiveCount <= 2) {
        diversified.push(item.post);
      } else {
        remaining.push(item.post);
      }
    }
    // Append any overflow items at the end to satisfy limit if available
    diversified.push(...remaining);

    const hasNextPage = diversified.length > limit;
    const pageItems = hasNextPage ? diversified.slice(0, limit) : diversified;

    const items: PostFeedItemDto[] = await Promise.all(
      pageItems.map(async (post) => {
        const hasLiked = post.likes && post.likes.length > 0;
        const hasBookmarked = post.bookmarks && post.bookmarks.length > 0;
        const hasReposted = post.reposts && post.reposts.length > 0;

        const mediaItems: PostMediaItemDto[] = await Promise.all(
          (post.media || []).map(async (m) => {
            const mediaDto = await this.mediaService.toDto(m.mediaObject);
            return {
              id: m.mediaObject.id,
              url: mediaDto.publicUrl || '',
              kind: m.mediaObject.kind,
              mimeType: m.mediaObject.mimeType,
              width: m.mediaObject.width,
              height: m.mediaObject.height,
              durationMs: m.mediaObject.durationMs,
              position: m.position,
            };
          }),
        );

        return {
          id: post.id,
          content: post.content || '',
          visibility: post.visibility,
          locationTag: post.locationTag,
          stats: {
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            repostsCount: post.repostsCount,
          },
          viewer: {
            hasLiked: !!hasLiked,
            hasBookmarked: !!hasBookmarked,
            hasReposted: !!hasReposted,
          },
          author: {
            id: post.author.id,
            username: post.author.username,
            displayName: post.author.displayName || post.author.username,
            avatarUrl: post.author.avatarUrl,
            isVerified: post.author.isVerified,
            isPremium: post.author.isPremium,
          },
          media: mediaItems,
          editedAt: post.editedAt?.toISOString() ?? null,
          createdAt: post.createdAt.toISOString(),
        };
      }),
    );

    const nextCursor =
      hasNextPage && pageItems.length > 0
        ? this.encodeCursor(
            pageItems[pageItems.length - 1].createdAt,
            pageItems[pageItems.length - 1].id,
          )
        : null;

    return { items, pageInfo: { nextCursor, hasNextPage } };
  }

  /**
   * Recent searches management with Redis
   */
  async getRecentSearches(userId: string): Promise<string[]> {
    try {
      const key = `search:recents:${userId}`;
      const items = await this.redis.lrange(key, 0, 14);
      return items;
    } catch {
      return [];
    }
  }

  async addRecentSearch(userId: string, term: string): Promise<void> {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;
    try {
      const key = `search:recents:${userId}`;
      // Remove any existing duplicate and push to front
      await this.redis.lrem(key, 0, cleanTerm);
      await this.redis.lpush(key, cleanTerm);
      await this.redis.ltrim(key, 0, 14);
      await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days
    } catch {
      // Non-fatal
    }
  }

  async deleteRecentSearch(userId: string, term: string): Promise<void> {
    try {
      const key = `search:recents:${userId}`;
      await this.redis.lrem(key, 0, term);
    } catch {
      // Non-fatal
    }
  }

  async clearRecentSearches(userId: string): Promise<void> {
    try {
      const key = `search:recents:${userId}`;
      await this.redis.del(key);
    } catch {
      // Non-fatal
    }
  }

  private categorizeTag(tag: string): string {
    const t = tag.toLowerCase();
    if (
      t.includes('design') ||
      t.includes('art') ||
      t.includes('ui') ||
      t.includes('ux') ||
      t.includes('3d')
    ) {
      return 'Trending in Design & Art';
    }
    if (
      t.includes('ai') ||
      t.includes('tech') ||
      t.includes('code') ||
      t.includes('dev') ||
      t.includes('app')
    ) {
      return 'Trending in Technology';
    }
    if (
      t.includes('music') ||
      t.includes('beat') ||
      t.includes('sound') ||
      t.includes('song')
    ) {
      return 'Trending in Music';
    }
    if (t.includes('game') || t.includes('gaming') || t.includes('play')) {
      return 'Trending in Gaming';
    }
    return 'Trending on MixChat';
  }
}
