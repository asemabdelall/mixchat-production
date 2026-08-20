import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PostsPolicyService } from './posts-policy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MediaService } from '../media/media.service';
import { SocialPolicyService } from '../social/social-policy.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  MediaKind,
  MediaStatus,
  PostStatus,
  PostVisibility,
} from '@prisma/client';

describe('PostsService', () => {
  let service: PostsService;

  const mockPrisma: {
    post: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    mediaObject: {
      findMany: jest.Mock;
    };
    user: {
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    postLike: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    postBookmark: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    postRepost: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    block: {
      findMany: jest.Mock;
    };
    mute: {
      findMany: jest.Mock;
    };
    follow: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    closeFriend: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  } = {
    post: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    mediaObject: {
      findMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    postLike: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    postBookmark: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    postRepost: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    block: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    mute: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    follow: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    closeFriend: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn(
      (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma),
    ),
  };

  const mockMediaService = {
    toDto: jest
      .fn()
      .mockImplementation(
        (media: {
          id: string;
          objectKey?: string;
          kind: MediaKind;
          mimeType: string;
          width?: number;
          height?: number;
          durationMs?: number;
        }) =>
          Promise.resolve({
            id: media.id,
            publicUrl: `https://cdn.mixchat.app/${media.objectKey || 'media.webp'}`,
            kind: media.kind,
            mimeType: media.mimeType,
            width: media.width,
            height: media.height,
            durationMs: media.durationMs,
          }),
      ),
  };

  const mockSocialPolicy = {
    isBlockedEitherDirection: jest.fn().mockResolvedValue({ isBlocked: false }),
    isCloseFriend: jest.fn().mockResolvedValue(false),
    canViewProtectedContent: jest.fn().mockResolvedValue(true),
  };

  const mockPostsPolicy = {
    canViewPost: jest.fn().mockResolvedValue(true),
    assertCanView: jest.fn().mockResolvedValue(undefined),
    assertCanModify: jest
      .fn()
      .mockImplementation((userId: string, post: { authorId: string }) => {
        if (post.authorId !== userId) {
          throw new ForbiddenException('Not authorized');
        }
      }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MediaService, useValue: mockMediaService },
        { provide: SocialPolicyService, useValue: mockSocialPolicy },
        { provide: PostsPolicyService, useValue: mockPostsPolicy },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);

    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('persists and returns a validated text background theme', async () => {
      const mockCreated = {
        id: 'post-themed',
        authorId: 'user-1',
        content: 'A themed thought',
        visibility: PostVisibility.PUBLIC,
        locationTag: null,
        backgroundTheme: 'velvet',
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        editedAt: null,
        createdAt: new Date(),
        author: {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          isVerified: false,
          isPremium: false,
        },
        media: [],
      };
      mockPrisma.post.create.mockResolvedValue(mockCreated);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.createPost('user-1', {
        content: 'A themed thought',
        backgroundTheme: 'velvet',
      });

      expect(result.backgroundTheme).toBe('velvet');
      expect(mockPrisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ backgroundTheme: 'velvet' }),
        }),
      );
    });

    it('rejects a background theme when media is attached', async () => {
      await expect(
        service.createPost('user-1', {
          content: 'Invalid themed media post',
          backgroundTheme: 'cyber',
          mediaObjectIds: ['00000000-0000-4000-8000-000000000001'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a text-only post successfully', async () => {
      const mockCreated = {
        id: 'post-1',
        authorId: 'user-1',
        content: 'Hello MixChat!',
        visibility: PostVisibility.PUBLIC,
        locationTag: null,
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        editedAt: null,
        createdAt: new Date(),
        author: {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          isVerified: false,
          isPremium: false,
        },
        media: [],
      };

      mockPrisma.post.create.mockResolvedValue(mockCreated);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.createPost('user-1', {
        content: 'Hello MixChat!',
      });

      expect(result.id).toBe('post-1');
      expect(result.content).toBe('Hello MixChat!');
      expect(result.author.username).toBe('alice');
      expect(mockPrisma.post.create).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { postsCount: { increment: 1 } },
      });
    });

    it('should reject completely empty post (no text and no media)', async () => {
      await expect(
        service.createPost('user-1', { content: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create post with valid READY media objects owned by user', async () => {
      const mediaId = 'media-1';
      mockPrisma.mediaObject.findMany.mockResolvedValue([
        {
          id: mediaId,
          ownerId: 'user-1',
          status: MediaStatus.READY,
          kind: MediaKind.IMAGE,
          mimeType: 'image/png',
          objectKey: 'users/user-1/media/image.png',
        },
      ]);

      const mockCreated = {
        id: 'post-2',
        authorId: 'user-1',
        content: 'Photo post',
        visibility: PostVisibility.PUBLIC,
        locationTag: 'San Francisco, CA',
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        editedAt: null,
        createdAt: new Date(),
        author: {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          isVerified: false,
          isPremium: false,
        },
        media: [
          {
            position: 0,
            mediaObject: {
              id: mediaId,
              kind: MediaKind.IMAGE,
              mimeType: 'image/png',
              objectKey: 'users/user-1/media/image.png',
            },
          },
        ],
      };

      mockPrisma.post.create.mockResolvedValue(mockCreated);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.createPost('user-1', {
        content: 'Photo post',
        locationTag: 'San Francisco, CA',
        mediaObjectIds: [mediaId],
      });

      expect(result.id).toBe('post-2');
      expect(result.media).toHaveLength(1);
      expect(result.media[0].url).toContain('users/user-1/media/image.png');
    });

    it('should reject attaching media owned by another user', async () => {
      mockPrisma.mediaObject.findMany.mockResolvedValue([
        {
          id: 'media-other',
          ownerId: 'user-2',
          status: MediaStatus.READY,
          kind: MediaKind.IMAGE,
        },
      ]);

      await expect(
        service.createPost('user-1', {
          content: 'Theft attempt',
          mediaObjectIds: ['media-other'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject attaching media that is not in READY state', async () => {
      mockPrisma.mediaObject.findMany.mockResolvedValue([
        {
          id: 'media-pending',
          ownerId: 'user-1',
          status: MediaStatus.PENDING,
          kind: MediaKind.IMAGE,
        },
      ]);

      await expect(
        service.createPost('user-1', {
          content: 'Unfinished upload',
          mediaObjectIds: ['media-pending'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFeed', () => {
    it('should return paginated feed items with cursor tie-breaking', async () => {
      const now = new Date();
      const mockPosts = [
        {
          id: 'post-1',
          authorId: 'user-2',
          content: 'Post 1',
          visibility: PostVisibility.PUBLIC,
          locationTag: null,
          likesCount: 5,
          commentsCount: 2,
          repostsCount: 0,
          editedAt: null,
          createdAt: now,
          author: {
            id: 'user-2',
            username: 'bob',
            displayName: 'Bob',
            avatarUrl: null,
            isVerified: false,
            isPremium: false,
          },
          media: [],
        },
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.postLike.findMany.mockResolvedValue([{ postId: 'post-1' }]);
      mockPrisma.postBookmark.findMany.mockResolvedValue([]);

      const feed = await service.getFeed('user-1', {
        limit: 10,
        tab: 'for_you',
      });

      expect(feed.items).toHaveLength(1);
      expect(feed.items[0].id).toBe('post-1');
      expect(feed.items[0].viewer.hasLiked).toBe(true);
      expect(feed.items[0].viewer.hasBookmarked).toBe(false);
      expect(feed.pageInfo.hasNextPage).toBe(false);
    });

    it('should carry the trending rank through its stable cursor', async () => {
      const firstPost = {
        id: 'post-ranked-1',
        authorId: 'user-2',
        content: 'Ranked post',
        visibility: PostVisibility.PUBLIC,
        locationTag: null,
        likesCount: 42,
        commentsCount: 0,
        repostsCount: 0,
        editedAt: null,
        createdAt: new Date('2026-08-16T00:00:00.000Z'),
        author: {
          id: 'user-2',
          username: 'ranked',
          displayName: 'Ranked',
          avatarUrl: null,
          isVerified: false,
          isPremium: false,
        },
        media: [],
      };
      mockPrisma.post.findMany.mockResolvedValue([firstPost, firstPost]);
      mockPrisma.postLike.findMany.mockResolvedValue([]);
      mockPrisma.postBookmark.findMany.mockResolvedValue([]);
      mockPrisma.postRepost.findMany.mockResolvedValue([]);

      const firstPage = await service.getFeed('user-1', {
        limit: 1,
        tab: 'trending',
      });
      expect(firstPage.pageInfo.nextCursor).toBeTruthy();

      mockPrisma.post.findMany.mockResolvedValue([]);
      await service.getFeed('user-1', {
        limit: 1,
        tab: 'trending',
        cursor: firstPage.pageInfo.nextCursor!,
      });

      const query = mockPrisma.post.findMany.mock.calls.at(-1)?.[0];
      expect(query.where.AND[0].OR).toEqual([
        { likesCount: { lt: 42 } },
        {
          likesCount: 42,
          createdAt: { lt: new Date('2026-08-16T00:00:00.000Z') },
        },
        {
          likesCount: 42,
          createdAt: new Date('2026-08-16T00:00:00.000Z'),
          id: { lt: 'post-ranked-1' },
        },
      ]);
    });
  });

  describe('like and unlike', () => {
    it('should like post atomically and increment counter', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.PUBLISHED,
        likesCount: 0,
        authorId: 'user-2',
      });
      mockPrisma.postLike.findUnique.mockResolvedValue(null);
      mockPrisma.postLike.create.mockResolvedValue({});
      mockPrisma.post.update.mockResolvedValue({ likesCount: 1 });

      const res = await service.likePost('user-1', 'post-1');

      expect(res.hasLiked).toBe(true);
      expect(res.likesCount).toBe(1);
      expect(mockPrisma.postLike.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', postId: 'post-1' },
      });
    });

    it('should handle duplicate like idempotently without incrementing counter twice', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.PUBLISHED,
        likesCount: 1,
        authorId: 'user-2',
      });
      mockPrisma.postLike.findUnique.mockResolvedValue({ id: 'like-1' });

      const res = await service.likePost('user-1', 'post-1');

      expect(res.hasLiked).toBe(true);
      expect(res.likesCount).toBe(1);
      expect(mockPrisma.postLike.create).not.toHaveBeenCalled();
    });

    it('should unlike post and decrement counter without underflow', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.PUBLISHED,
        likesCount: 1,
        authorId: 'user-2',
      });
      mockPrisma.postLike.findUnique.mockResolvedValue({ id: 'like-1' });
      mockPrisma.postLike.delete.mockResolvedValue({});
      mockPrisma.post.update.mockResolvedValue({ likesCount: 0 });

      const res = await service.unlikePost('user-1', 'post-1');

      expect(res.hasLiked).toBe(false);
      expect(res.likesCount).toBe(0);
    });
  });

  describe('bookmarks', () => {
    it('should bookmark post idempotently', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.PUBLISHED,
        authorId: 'user-2',
      });
      mockPrisma.postBookmark.findUnique.mockResolvedValue(null);
      mockPrisma.postBookmark.create.mockResolvedValue({});
      mockPrisma.post.update.mockResolvedValue({});

      const res = await service.bookmarkPost('user-1', 'post-1');
      expect(res.hasBookmarked).toBe(true);
    });

    it('should unbookmark post idempotently', async () => {
      mockPrisma.postBookmark.findUnique.mockResolvedValue({ id: 'bm-1' });
      mockPrisma.postBookmark.delete.mockResolvedValue({});
      mockPrisma.post.update.mockResolvedValue({});

      const res = await service.unbookmarkPost('user-1', 'post-1');
      expect(res.hasBookmarked).toBe(false);
    });
  });

  describe('reposts', () => {
    it('should repost a visible post atomically', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.PUBLISHED,
        repostsCount: 0,
        authorId: 'user-2',
      });
      mockPrisma.postRepost.create.mockResolvedValue({});
      mockPrisma.post.update.mockResolvedValue({ repostsCount: 1 });

      const result = await service.repostPost('user-1', 'post-1');

      expect(result).toEqual({ hasReposted: true, repostsCount: 1 });
      expect(mockPostsPolicy.assertCanView).toHaveBeenCalled();
      expect(mockPrisma.postRepost.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', postId: 'post-1' },
      });
    });

    it('should undo repost idempotently without counter underflow', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.PUBLISHED,
        repostsCount: 1,
        authorId: 'user-2',
      });
      mockPrisma.postRepost.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.post.update.mockResolvedValue({ repostsCount: 0 });

      const result = await service.unrepostPost('user-1', 'post-1');

      expect(result).toEqual({ hasReposted: false, repostsCount: 0 });
    });

    it('should not decrement when no repost exists', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.PUBLISHED,
        repostsCount: 0,
        authorId: 'user-2',
      });
      mockPrisma.postRepost.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.unrepostPost('user-1', 'post-1');

      expect(result).toEqual({ hasReposted: false, repostsCount: 0 });
      expect(mockPrisma.post.update).not.toHaveBeenCalled();
    });
  });

  describe('deletePost', () => {
    it('should soft-delete post and decrement user post count', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        authorId: 'user-1',
        status: PostStatus.PUBLISHED,
      });
      mockPrisma.post.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const res = await service.deletePost('user-1', 'post-1');

      expect(res.message).toBe('Post deleted successfully');
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: PostStatus.DELETED },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { postsCount: { decrement: 1 } },
      });
    });

    it('should reject deleting another user post with ForbiddenException', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        authorId: 'user-2',
        status: PostStatus.PUBLISHED,
      });

      await expect(service.deletePost('user-1', 'post-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
