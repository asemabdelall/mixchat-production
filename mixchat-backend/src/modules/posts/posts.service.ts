import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MediaService } from '../media/media.service';
import { SocialPolicyService } from '../social/social-policy.service';
import { PostsPolicyService } from './posts-policy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FeedQueryDto, UserPostsQueryDto } from './dto/feed-query.dto';
import {
  PaginatedFeedResponseDto,
  PostFeedItemDto,
  PostMediaItemDto,
} from './dto/post-response.dto';
import {
  MediaObject,
  MediaStatus,
  NotificationType,
  PostStatus,
  PostVisibility,
  Prisma,
} from '@prisma/client';

interface DecodedCursor {
  createdAt: string;
  id: string;
  likesCount?: number;
}

interface PostWithRelations {
  id: string;
  authorId: string;
  content: string | null;
  visibility: PostVisibility;
  locationTag: string | null;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  editedAt: Date | null;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    isPremium: boolean;
  };
  media?: Array<{
    position: number;
    mediaObject: MediaObject;
  }>;
}

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly socialPolicy: SocialPolicyService,
    private readonly postsPolicy: PostsPolicyService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Encodes a stable cursor into a base64url string
   */
  private encodeCursor(
    createdAt: Date,
    id: string,
    likesCount?: number,
  ): string {
    const payload: DecodedCursor = {
      createdAt: createdAt.toISOString(),
      id,
      ...(likesCount === undefined ? {} : { likesCount }),
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /**
   * Safely decodes an opaque cursor string
   */
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
        message: 'Invalid pagination cursor format',
      });
    }
  }

  /**
   * Helper to map DB post record + relations into PostFeedItemDto
   */
  private async formatPostItem(
    post: PostWithRelations,
    viewerLiked: boolean,
    viewerBookmarked: boolean,
    viewerReposted: boolean,
  ): Promise<PostFeedItemDto> {
    const mediaItems: PostMediaItemDto[] = [];

    if (post.media && post.media.length > 0) {
      for (const item of post.media) {
        const mediaObj = item.mediaObject;
        if (mediaObj) {
          const mediaDto = await this.mediaService.toDto(mediaObj);
          mediaItems.push({
            id: mediaObj.id,
            url: mediaDto.publicUrl || '',
            kind: mediaObj.kind,
            mimeType: mediaObj.mimeType,
            width: mediaObj.width,
            height: mediaObj.height,
            durationMs: mediaObj.durationMs,
            position: item.position,
          });
        }
      }
    }

    return {
      id: post.id,
      author: {
        id: post.author.id,
        username: post.author.username,
        displayName: post.author.displayName || post.author.username,
        avatarUrl: post.author.avatarUrl,
        isVerified: post.author.isVerified,
        isPremium: post.author.isPremium,
      },
      content: post.content || '',
      visibility: post.visibility,
      locationTag: post.locationTag,
      media: mediaItems,
      stats: {
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        repostsCount: post.repostsCount,
      },
      viewer: {
        hasLiked: viewerLiked,
        hasBookmarked: viewerBookmarked,
        hasReposted: viewerReposted,
      },
      editedAt: post.editedAt ? post.editedAt.toISOString() : null,
      createdAt: post.createdAt.toISOString(),
    };
  }

  /**
   * Create a new post with transactional validation & media attachment
   */
  async createPost(
    userId: string,
    dto: CreatePostDto,
  ): Promise<PostFeedItemDto> {
    const content = dto.content ? dto.content.trim() : '';
    const mediaIds = dto.mediaObjectIds || [];

    if (!content && mediaIds.length === 0) {
      throw new BadRequestException({
        code: 'POST_INVALID_CONTENT',
        message: 'A post must contain text content or at least one media item',
      });
    }

    // Validate media objects if provided
    if (mediaIds.length > 0) {
      const mediaObjects = await this.prisma.mediaObject.findMany({
        where: {
          id: { in: mediaIds },
        },
      });

      if (mediaObjects.length !== mediaIds.length) {
        throw new BadRequestException({
          code: 'POST_MEDIA_NOT_FOUND',
          message: 'One or more specified media objects do not exist',
        });
      }

      for (const m of mediaObjects) {
        if (m.ownerId !== userId) {
          throw new BadRequestException({
            code: 'POST_MEDIA_NOT_OWNED',
            message: 'You cannot attach media objects uploaded by other users',
          });
        }
        if (m.status !== MediaStatus.READY) {
          throw new BadRequestException({
            code: 'POST_MEDIA_NOT_READY',
            message:
              'Only finalized READY media objects can be attached to a post',
          });
        }
      }
    }

    const createdPost = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId: userId,
          content,
          visibility: dto.visibility || PostVisibility.PUBLIC,
          locationTag: dto.locationTag?.trim() || null,
          media: {
            create: mediaIds.map((mediaObjectId, index) => ({
              mediaObjectId,
              position: index,
            })),
          },
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
          media: {
            include: { mediaObject: true },
            orderBy: { position: 'asc' },
          },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { postsCount: { increment: 1 } },
      });

      return post;
    });

    this.logger.log(
      `Created post: postId=${createdPost.id} authorId=${userId}`,
    );

    return await this.formatPostItem(createdPost, false, false, false);
  }

  /**
   * Cursor-paginated Feed for current authenticated user
   */
  async getFeed(
    viewerId: string,
    query: FeedQueryDto,
  ): Promise<PaginatedFeedResponseDto> {
    const limit = Math.min(Math.max(query.limit || 20, 1), 50);
    const decodedCursor = this.decodeCursor(query.cursor);

    // 1. Get blocked and muted users list to exclude
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

    const excludedAuthorIds = new Set<string>();
    blocks.forEach((b) => {
      if (b.blockerId === viewerId) excludedAuthorIds.add(b.blockedId);
      if (b.blockedId === viewerId) excludedAuthorIds.add(b.blockerId);
    });
    mutes.forEach((m) => excludedAuthorIds.add(m.mutedId));

    // 2. Build tab-specific query conditions
    const where: Prisma.PostWhereInput = {
      status: PostStatus.PUBLISHED,
      authorId: {
        notIn: Array.from(excludedAuthorIds),
      },
    };

    if (query.tab === 'following') {
      const follows = await this.prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
      });
      const followingIds = follows.map((f) => f.followingId);
      followingIds.push(viewerId); // Include own posts

      where.authorId = {
        in: followingIds.filter((id) => !excludedAuthorIds.has(id)),
      };
    } else {
      // For You or Trending: include own posts, public posts (from public profiles or followed private profiles), followers-only posts from followed users, close-friends posts
      const [following, closeFriendsOfViewer] = await Promise.all([
        this.prisma.follow.findMany({
          where: { followerId: viewerId },
          select: { followingId: true },
        }),
        this.prisma.closeFriend.findMany({
          where: { friendId: viewerId },
          select: { userId: true },
        }),
      ]);

      const followingIds = following.map((f) => f.followingId);
      const closeFriendsOwnerIds = closeFriendsOfViewer.map((cf) => cf.userId);

      where.OR = [
        // Viewer's own posts
        { authorId: viewerId },
        // Public posts from public accounts
        {
          visibility: PostVisibility.PUBLIC,
          author: { isPrivate: false },
        },
        // Public or Followers posts from users viewer follows
        {
          visibility: { in: [PostVisibility.PUBLIC, PostVisibility.FOLLOWERS] },
          authorId: { in: followingIds },
        },
        // Close friends posts where viewer is on author's close friends list
        {
          visibility: PostVisibility.CLOSE_FRIENDS,
          authorId: { in: closeFriendsOwnerIds },
        },
      ];
    }

    // 3. Add cursor condition
    if (decodedCursor) {
      const cursorDate = new Date(decodedCursor.createdAt);
      if (
        query.tab === 'trending' &&
        !Number.isInteger(decodedCursor.likesCount)
      ) {
        throw new BadRequestException({
          code: 'CURSOR_INVALID',
          message: 'Trending cursor is missing its ranking value',
        });
      }

      const cursorCondition: Prisma.PostWhereInput =
        query.tab === 'trending'
          ? {
              OR: [
                { likesCount: { lt: decodedCursor.likesCount } },
                {
                  likesCount: decodedCursor.likesCount,
                  createdAt: { lt: cursorDate },
                },
                {
                  likesCount: decodedCursor.likesCount,
                  createdAt: cursorDate,
                  id: { lt: decodedCursor.id },
                },
              ],
            }
          : {
              OR: [
                { createdAt: { lt: cursorDate } },
                {
                  createdAt: cursorDate,
                  id: { lt: decodedCursor.id },
                },
              ],
            };
      where.AND = [cursorCondition];
    }

    // 4. Fetch limit + 1 posts
    const posts = await this.prisma.post.findMany({
      where,
      take: limit + 1,
      orderBy:
        query.tab === 'trending'
          ? [{ likesCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
          : [{ createdAt: 'desc' }, { id: 'desc' }],
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
          include: { mediaObject: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    const hasNextPage = posts.length > limit;
    const pageItems = hasNextPage ? posts.slice(0, limit) : posts;

    // 5. Batch-load viewer like and bookmark states
    const postIds = pageItems.map((p) => p.id);
    const [viewerLikes, viewerBookmarks, viewerReposts] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
      this.prisma.postBookmark.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
      this.prisma.postRepost.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);

    const likedPostIds = new Set(viewerLikes.map((l) => l.postId));
    const bookmarkedPostIds = new Set(viewerBookmarks.map((b) => b.postId));
    const repostedPostIds = new Set(viewerReposts.map((r) => r.postId));

    const formattedItems = await Promise.all(
      pageItems.map((post) =>
        this.formatPostItem(
          post,
          likedPostIds.has(post.id),
          bookmarkedPostIds.has(post.id),
          repostedPostIds.has(post.id),
        ),
      ),
    );

    let nextCursor: string | null = null;
    if (hasNextPage && pageItems.length > 0) {
      const lastItem = pageItems[pageItems.length - 1];
      nextCursor = this.encodeCursor(
        lastItem.createdAt,
        lastItem.id,
        query.tab === 'trending' ? lastItem.likesCount : undefined,
      );
    }

    return {
      items: formattedItems,
      pageInfo: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  /**
   * Get single post by ID with authorization and privacy verification
   */
  async getPost(viewerId: string, postId: string): Promise<PostFeedItemDto> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
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
          include: { mediaObject: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found or unavailable',
      });
    }

    await this.postsPolicy.assertCanView(viewerId, post);

    const [like, bookmark, repost] = await Promise.all([
      this.prisma.postLike.findUnique({
        where: { userId_postId: { userId: viewerId, postId } },
      }),
      this.prisma.postBookmark.findUnique({
        where: { userId_postId: { userId: viewerId, postId } },
      }),
      this.prisma.postRepost.findUnique({
        where: { userId_postId: { userId: viewerId, postId } },
      }),
    ]);

    return await this.formatPostItem(post, !!like, !!bookmark, !!repost);
  }

  /**
   * Get user posts for profile pages with cursor pagination & privacy checks
   */
  async getUserPosts(
    viewerId: string,
    username: string,
    query: UserPostsQueryDto,
  ): Promise<PaginatedFeedResponseDto> {
    const targetUser = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!targetUser) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const { isBlocked } = await this.socialPolicy.isBlockedEitherDirection(
      viewerId,
      targetUser.id,
    );
    if (isBlocked) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User profile not accessible',
      });
    }

    const limit = Math.min(Math.max(query.limit || 20, 1), 50);
    const decodedCursor = this.decodeCursor(query.cursor);

    const isOwner = viewerId === targetUser.id;
    let allowedVisibilities: PostVisibility[] = [PostVisibility.PUBLIC];

    if (isOwner) {
      allowedVisibilities = [
        PostVisibility.PUBLIC,
        PostVisibility.FOLLOWERS,
        PostVisibility.CLOSE_FRIENDS,
      ];
    } else {
      const [isFollowing, isCloseFriend] = await Promise.all([
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: targetUser.id,
            },
          },
        }),
        this.socialPolicy.isCloseFriend(targetUser.id, viewerId),
      ]);

      // If target user is private and viewer does not follow, return empty
      if (targetUser.isPrivate && !isFollowing) {
        return {
          items: [],
          pageInfo: { nextCursor: null, hasNextPage: false },
        };
      }

      if (isFollowing) {
        allowedVisibilities.push(PostVisibility.FOLLOWERS);
      }
      if (isCloseFriend) {
        allowedVisibilities.push(PostVisibility.CLOSE_FRIENDS);
      }
    }

    const where: Prisma.PostWhereInput = {
      authorId: targetUser.id,
      status: PostStatus.PUBLISHED,
      visibility: { in: allowedVisibilities },
    };

    if (decodedCursor) {
      const cursorDate = new Date(decodedCursor.createdAt);
      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursorDate } },
            {
              createdAt: cursorDate,
              id: { lt: decodedCursor.id },
            },
          ],
        },
      ];
    }

    const posts = await this.prisma.post.findMany({
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
          },
        },
        media: {
          include: { mediaObject: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    const hasNextPage = posts.length > limit;
    const pageItems = hasNextPage ? posts.slice(0, limit) : posts;

    const postIds = pageItems.map((p) => p.id);
    const [viewerLikes, viewerBookmarks, viewerReposts] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
      this.prisma.postBookmark.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
      this.prisma.postRepost.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);

    const likedPostIds = new Set(viewerLikes.map((l) => l.postId));
    const bookmarkedPostIds = new Set(viewerBookmarks.map((b) => b.postId));
    const repostedPostIds = new Set(viewerReposts.map((r) => r.postId));

    const formattedItems = await Promise.all(
      pageItems.map((post) =>
        this.formatPostItem(
          post,
          likedPostIds.has(post.id),
          bookmarkedPostIds.has(post.id),
          repostedPostIds.has(post.id),
        ),
      ),
    );

    let nextCursor: string | null = null;
    if (hasNextPage && pageItems.length > 0) {
      const lastItem = pageItems[pageItems.length - 1];
      nextCursor = this.encodeCursor(lastItem.createdAt, lastItem.id);
    }

    return {
      items: formattedItems,
      pageInfo: { nextCursor, hasNextPage },
    };
  }

  /**
   * Idempotent like mutation with atomic counter increment
   */
  async likePost(
    userId: string,
    postId: string,
  ): Promise<{ hasLiked: boolean; likesCount: number }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found or unavailable',
      });
    }

    await this.postsPolicy.assertCanView(userId, post);

    // Atomically create like if not exists, increment likesCount
    const result = await this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.postLike.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingLike) {
        return { hasLiked: true, likesCount: post.likesCount };
      }

      await tx.postLike.create({
        data: { userId, postId },
      });

      const updated = await tx.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
        select: { likesCount: true },
      });

      return { hasLiked: true, likesCount: updated.likesCount };
    });

    if (result.hasLiked) {
      await this.notificationsService.createNotification({
        recipientId: post.authorId,
        actorId: userId,
        type: NotificationType.LIKE_POST,
        entityId: post.id,
        entityType: 'POST',
        metadata: {
          previewText: post.content ? post.content.slice(0, 80) : undefined,
        },
      });
    }

    return result;
  }

  /**
   * Idempotent unlike mutation with atomic counter decrement
   */
  async unlikePost(
    userId: string,
    postId: string,
  ): Promise<{ hasLiked: boolean; likesCount: number }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found or unavailable',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.postLike.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (!existingLike) {
        return { hasLiked: false, likesCount: post.likesCount };
      }

      await tx.postLike.delete({
        where: { userId_postId: { userId, postId } },
      });

      const updated = await tx.post.update({
        where: { id: postId },
        data: {
          likesCount: {
            decrement: post.likesCount > 0 ? 1 : 0,
          },
        },
        select: { likesCount: true },
      });

      return { hasLiked: false, likesCount: Math.max(0, updated.likesCount) };
    });

    return result;
  }

  /**
   * Idempotent bookmark mutation
   */
  async bookmarkPost(
    userId: string,
    postId: string,
  ): Promise<{ hasBookmarked: boolean }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found or unavailable',
      });
    }

    await this.postsPolicy.assertCanView(userId, post);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.postBookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (!existing) {
        await tx.postBookmark.create({
          data: { userId, postId },
        });
        await tx.post.update({
          where: { id: postId },
          data: { bookmarksCount: { increment: 1 } },
        });
      }
    });

    return { hasBookmarked: true };
  }

  /**
   * Idempotent unbookmark mutation
   */
  async unbookmarkPost(
    userId: string,
    postId: string,
  ): Promise<{ hasBookmarked: boolean }> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.postBookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existing) {
        await tx.postBookmark.delete({
          where: { userId_postId: { userId, postId } },
        });
        await tx.post.update({
          where: { id: postId },
          data: {
            bookmarksCount: {
              decrement: 1,
            },
          },
        });
      }
    });

    return { hasBookmarked: false };
  }

  /**
   * Idempotently repost a visible post and atomically update its counter.
   */
  async repostPost(
    userId: string,
    postId: string,
  ): Promise<{ hasReposted: boolean; repostsCount: number }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found or unavailable',
      });
    }

    await this.postsPolicy.assertCanView(userId, post);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.postRepost.create({ data: { userId, postId } });
        return await tx.post.update({
          where: { id: postId },
          data: { repostsCount: { increment: 1 } },
          select: { repostsCount: true },
        });
      });

      await this.notificationsService.createNotification({
        recipientId: post.authorId,
        actorId: userId,
        type: NotificationType.REPOST_POST,
        entityId: post.id,
        entityType: 'POST',
      });

      return { hasReposted: true, repostsCount: updated.repostsCount };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const current = await this.prisma.post.findUnique({
          where: { id: postId },
          select: { repostsCount: true },
        });
        return {
          hasReposted: true,
          repostsCount: current?.repostsCount ?? post.repostsCount,
        };
      }
      throw error;
    }
  }

  /**
   * Idempotently remove a repost and atomically update its counter.
   */
  async unrepostPost(
    userId: string,
    postId: string,
  ): Promise<{ hasReposted: boolean; repostsCount: number }> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found or unavailable',
      });
    }

    const repostsCount = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.postRepost.deleteMany({
        where: { userId, postId },
      });

      if (deleted.count === 0) return post.repostsCount;

      const updated = await tx.post.update({
        where: { id: postId },
        data: {
          repostsCount: { decrement: post.repostsCount > 0 ? 1 : 0 },
        },
        select: { repostsCount: true },
      });
      return Math.max(0, updated.repostsCount);
    });

    return { hasReposted: false, repostsCount };
  }

  /**
   * Get user's saved/bookmarked posts with cursor pagination
   */
  async getBookmarkedPosts(
    userId: string,
    query: UserPostsQueryDto,
  ): Promise<PaginatedFeedResponseDto> {
    const limit = Math.min(Math.max(query.limit || 20, 1), 50);
    const decodedCursor = this.decodeCursor(query.cursor);

    const where: Prisma.PostBookmarkWhereInput = {
      userId,
      post: {
        status: PostStatus.PUBLISHED,
      },
    };

    if (decodedCursor) {
      const cursorDate = new Date(decodedCursor.createdAt);
      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursorDate } },
            {
              createdAt: cursorDate,
              id: { lt: decodedCursor.id },
            },
          ],
        },
      ];
    }

    const bookmarks = await this.prisma.postBookmark.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        post: {
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
              include: { mediaObject: true },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    const hasNextPage = bookmarks.length > limit;
    const pageItems = hasNextPage ? bookmarks.slice(0, limit) : bookmarks;

    const postIds = pageItems.map((b) => b.post.id);
    const [viewerLikes, viewerReposts] = await Promise.all([
      this.prisma.postLike.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
      this.prisma.postRepost.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);
    const likedPostIds = new Set(viewerLikes.map((l) => l.postId));
    const repostedPostIds = new Set(viewerReposts.map((r) => r.postId));

    const formattedItems = await Promise.all(
      pageItems.map((b) =>
        this.formatPostItem(
          b.post,
          likedPostIds.has(b.post.id),
          true,
          repostedPostIds.has(b.post.id),
        ),
      ),
    );

    let nextCursor: string | null = null;
    if (hasNextPage && pageItems.length > 0) {
      const lastItem = pageItems[pageItems.length - 1];
      nextCursor = this.encodeCursor(lastItem.createdAt, lastItem.id);
    }

    return {
      items: formattedItems,
      pageInfo: { nextCursor, hasNextPage },
    };
  }

  /**
   * Update post content / location / visibility (author only)
   */
  async updatePost(
    userId: string,
    postId: string,
    dto: UpdatePostDto,
  ): Promise<PostFeedItemDto> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
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
          include: { mediaObject: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found',
      });
    }

    this.postsPolicy.assertCanModify(userId, post);

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        content: dto.content !== undefined ? dto.content.trim() : post.content,
        visibility: dto.visibility || post.visibility,
        locationTag:
          dto.locationTag !== undefined
            ? dto.locationTag.trim() || null
            : post.locationTag,
        editedAt: new Date(),
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
        media: {
          include: { mediaObject: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    const [like, bookmark, repost] = await Promise.all([
      this.prisma.postLike.findUnique({
        where: { userId_postId: { userId, postId } },
      }),
      this.prisma.postBookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      }),
      this.prisma.postRepost.findUnique({
        where: { userId_postId: { userId, postId } },
      }),
    ]);

    return await this.formatPostItem(updated, !!like, !!bookmark, !!repost);
  }

  /**
   * Delete post (author only) with post count adjustment
   */
  async deletePost(
    userId: string,
    postId: string,
  ): Promise<{ message: string }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found',
      });
    }

    this.postsPolicy.assertCanModify(userId, post);

    await this.prisma.$transaction(async (tx) => {
      // Soft-delete post
      await tx.post.update({
        where: { id: postId },
        data: { status: PostStatus.DELETED },
      });

      // Decrement author post count
      await tx.user.update({
        where: { id: userId },
        data: {
          postsCount: {
            decrement: 1,
          },
        },
      });
    });

    this.logger.log(`Deleted post: postId=${postId} by userId=${userId}`);

    return { message: 'Post deleted successfully' };
  }

  /**
   * Counter reconciliation utility
   */
  async reconcileCounters(postId: string): Promise<void> {
    const [likesCount, bookmarksCount, repostsCount] = await Promise.all([
      this.prisma.postLike.count({ where: { postId } }),
      this.prisma.postBookmark.count({ where: { postId } }),
      this.prisma.postRepost.count({ where: { postId } }),
    ]);

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        likesCount,
        bookmarksCount,
        repostsCount,
      },
    });
  }
}
