import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { CommentsPolicyService } from './comments-policy.service';
import { MentionService } from './mention.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommentStatus, PostStatus, PostVisibility } from '@prisma/client';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockPrisma: {
    comment: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    commentMention: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    commentLike: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    post: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  } = {
    comment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    commentMention: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    commentLike: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb: (prisma: unknown) => Promise<unknown>) =>
      cb(mockPrisma),
    ),
  };

  const mockPolicy: {
    assertCanAccessPost: jest.Mock;
    assertCanModifyComment: jest.Mock;
    canModifyComment: jest.Mock;
  } = {
    assertCanAccessPost: jest.fn(),
    assertCanModifyComment: jest.fn(),
    canModifyComment: jest.fn(),
  };

  const mockMentionService: {
    extractMentionCandidates: jest.Mock;
    resolveMentions: jest.Mock;
  } = {
    extractMentionCandidates: jest.fn(),
    resolveMentions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommentsPolicyService, useValue: mockPolicy },
        { provide: MentionService, useValue: mockMentionService },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);

    jest.clearAllMocks();
  });

  describe('createComment', () => {
    it('creates top-level comment and increments post commentsCount', async () => {
      const userId = 'user-1';
      const postId = 'post-1';
      const dto = { content: 'Great post! @bob' };

      mockPolicy.assertCanAccessPost.mockResolvedValue({
        id: postId,
        visibility: PostVisibility.PUBLIC,
        status: PostStatus.PUBLISHED,
      });

      mockMentionService.resolveMentions.mockResolvedValue([
        { userId: 'user-2', username: 'bob' },
      ]);

      mockPrisma.comment.create.mockResolvedValue({
        id: 'comment-1',
        postId,
        authorId: userId,
        parentId: null,
        rootId: null,
        content: 'Great post! @bob',
        status: CommentStatus.PUBLISHED,
        deletedAt: null,
        repliesCount: 0,
        likesCount: 0,
        editedAt: null,
        createdAt: new Date('2026-08-14T20:00:00.000Z'),
        author: {
          id: userId,
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          isVerified: false,
          isPremium: false,
        },
        mentions: [{ mentionedUserId: 'user-2', username: 'bob' }],
      });

      mockPolicy.canModifyComment.mockReturnValue(true);

      const result = await service.createComment(userId, postId, dto);

      expect(mockPolicy.assertCanAccessPost).toHaveBeenCalledWith(
        userId,
        postId,
      );
      expect(mockMentionService.resolveMentions).toHaveBeenCalledWith(
        userId,
        'Great post! @bob',
      );
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      });
      expect(result.id).toBe('comment-1');
      expect(result.content).toBe('Great post! @bob');
      expect(result.mentions).toHaveLength(1);
      expect(result.viewer.canEdit).toBe(true);
    });

    it('throws BadRequestException if content is empty or whitespace', async () => {
      await expect(
        service.createComment('user-1', 'post-1', { content: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createReply', () => {
    it('creates reply and sets rootId to parent id when parent is top-level', async () => {
      const userId = 'user-2';
      const parentId = 'comment-1';
      const dto = { content: 'Thanks Alice!' };

      mockPrisma.comment.findUnique.mockResolvedValue({
        id: parentId,
        postId: 'post-1',
        authorId: 'user-1',
        parentId: null,
        rootId: null,
        status: CommentStatus.PUBLISHED,
      });

      mockPolicy.assertCanAccessPost.mockResolvedValue(true);
      mockMentionService.resolveMentions.mockResolvedValue([]);

      mockPrisma.comment.create.mockResolvedValue({
        id: 'reply-1',
        postId: 'post-1',
        authorId: userId,
        parentId,
        rootId: parentId,
        content: 'Thanks Alice!',
        status: CommentStatus.PUBLISHED,
        deletedAt: null,
        repliesCount: 0,
        likesCount: 0,
        editedAt: null,
        createdAt: new Date('2026-08-14T20:05:00.000Z'),
        author: {
          id: userId,
          username: 'bob',
          displayName: 'Bob',
          avatarUrl: null,
          isVerified: false,
          isPremium: false,
        },
        mentions: [],
      });

      mockPolicy.canModifyComment.mockReturnValue(true);

      const result = await service.createReply(userId, parentId, dto);

      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: parentId },
        data: { repliesCount: { increment: 1 } },
      });
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { commentsCount: { increment: 1 } },
      });
      expect(result.parentId).toBe(parentId);
      expect(result.rootId).toBe(parentId);
    });

    it('throws NotFoundException if parent comment does not exist', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);
      await expect(
        service.createReply('user-1', 'invalid-id', { content: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPostComments', () => {
    it('returns formatted paginated comments with tombstone handling', async () => {
      const userId = 'user-1';
      const postId = 'post-1';

      mockPolicy.assertCanAccessPost.mockResolvedValue(true);

      const comments = [
        {
          id: 'comment-1',
          postId,
          authorId: 'user-2',
          parentId: null,
          rootId: null,
          content: 'Hello world',
          status: CommentStatus.PUBLISHED,
          deletedAt: null,
          repliesCount: 1,
          likesCount: 2,
          editedAt: null,
          createdAt: new Date('2026-08-14T20:00:00.000Z'),
          author: {
            id: 'user-2',
            username: 'bob',
            displayName: 'Bob',
            avatarUrl: null,
            isVerified: false,
            isPremium: false,
          },
          mentions: [],
        },
        {
          id: 'comment-2',
          postId,
          authorId: 'user-3',
          parentId: null,
          rootId: null,
          content: '',
          status: CommentStatus.DELETED,
          deletedAt: new Date(),
          repliesCount: 2,
          likesCount: 0,
          editedAt: null,
          createdAt: new Date('2026-08-14T20:10:00.000Z'),
          author: {
            id: 'user-3',
            username: 'carol',
            displayName: 'Carol',
            avatarUrl: null,
            isVerified: false,
            isPremium: false,
          },
          mentions: [],
        },
      ];

      mockPrisma.comment.findMany.mockResolvedValue(comments);
      mockPrisma.commentLike.findMany.mockResolvedValue([
        { commentId: 'comment-1' },
      ]);
      mockPolicy.canModifyComment.mockReturnValue(false);

      const result = await service.getPostComments(userId, postId, {
        limit: 20,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].content).toBe('Hello world');
      expect(result.items[0].viewer.hasLiked).toBe(true);
      expect(result.items[1].isDeleted).toBe(true);
      expect(result.items[1].author).toBeNull();
      expect(result.items[1].content).toBeNull();
      expect(result.items[1].stats.repliesCount).toBe(2);
    });
  });

  describe('updateComment', () => {
    it('updates comment content, triggers mention re-indexing, and sets editedAt', async () => {
      const userId = 'user-1';
      const commentId = 'comment-1';

      mockPrisma.comment.findUnique.mockResolvedValue({
        id: commentId,
        authorId: userId,
        status: CommentStatus.PUBLISHED,
        content: 'Old text',
        author: {
          id: userId,
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          isVerified: false,
          isPremium: false,
        },
        mentions: [],
      });

      mockMentionService.resolveMentions.mockResolvedValue([
        { userId: 'user-3', username: 'charlie' },
      ]);

      mockPrisma.comment.update.mockResolvedValue({
        id: commentId,
        postId: 'post-1',
        authorId: userId,
        parentId: null,
        rootId: null,
        content: 'New text @charlie',
        status: CommentStatus.PUBLISHED,
        deletedAt: null,
        repliesCount: 0,
        likesCount: 0,
        editedAt: new Date('2026-08-14T20:20:00.000Z'),
        createdAt: new Date('2026-08-14T20:00:00.000Z'),
        author: {
          id: userId,
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: null,
          isVerified: false,
          isPremium: false,
        },
        mentions: [{ mentionedUserId: 'user-3', username: 'charlie' }],
      });

      mockPolicy.canModifyComment.mockReturnValue(true);

      const result = await service.updateComment(userId, commentId, {
        content: 'New text @charlie',
      });

      expect(mockPolicy.assertCanModifyComment).toHaveBeenCalled();
      expect(mockPrisma.commentMention.deleteMany).toHaveBeenCalledWith({
        where: { commentId },
      });
      expect(result.content).toBe('New text @charlie');
      expect(result.editedAt).toBeDefined();
    });

    it('rejects editing a deleted comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        authorId: 'user-1',
        status: CommentStatus.DELETED,
      });

      await expect(
        service.updateComment('user-1', 'comment-1', { content: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteComment', () => {
    it('sets tombstone status when comment has child replies', async () => {
      const userId = 'user-1';
      const commentId = 'comment-1';

      mockPrisma.comment.findUnique.mockResolvedValue({
        id: commentId,
        postId: 'post-1',
        authorId: userId,
        status: CommentStatus.PUBLISHED,
        repliesCount: 3,
      });

      mockPrisma.post.findUnique.mockResolvedValue({ commentsCount: 5 });

      const result = await service.deleteComment(userId, commentId);

      expect(mockPrisma.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: commentId },
        }),
      );
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { commentsCount: { decrement: 1 } },
      });
      expect(result.message).toContain('deleted');
    });

    it('decrements parent repliesCount when deleting a leaf reply', async () => {
      const userId = 'user-2';
      const commentId = 'reply-1';

      mockPrisma.comment.findUnique.mockResolvedValue({
        id: commentId,
        postId: 'post-1',
        authorId: userId,
        parentId: 'parent-1',
        rootId: 'parent-1',
        status: CommentStatus.PUBLISHED,
        repliesCount: 0,
      });

      mockPrisma.post.findUnique.mockResolvedValue({ commentsCount: 5 });

      await service.deleteComment(userId, commentId);

      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
        data: { repliesCount: { decrement: 1 } },
      });
    });
  });

  describe('like and unlike comment', () => {
    it('likes comment idempotently and increments counter', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        postId: 'post-1',
        status: CommentStatus.PUBLISHED,
        likesCount: 5,
      });
      mockPrisma.commentLike.findUnique.mockResolvedValue(null);
      mockPrisma.comment.update.mockResolvedValue({ likesCount: 6 });

      const result = await service.likeComment('user-1', 'comment-1');

      expect(mockPrisma.commentLike.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', commentId: 'comment-1' },
      });
      expect(result.hasLiked).toBe(true);
      expect(result.likesCount).toBe(6);
    });

    it('unlikes comment and decrements counter', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        likesCount: 6,
      });
      mockPrisma.commentLike.findUnique.mockResolvedValue({ id: 'like-1' });
      mockPrisma.comment.update.mockResolvedValue({ likesCount: 5 });

      const result = await service.unlikeComment('user-1', 'comment-1');

      expect(mockPrisma.commentLike.delete).toHaveBeenCalled();
      expect(result.hasLiked).toBe(false);
      expect(result.likesCount).toBe(5);
    });
  });
});
