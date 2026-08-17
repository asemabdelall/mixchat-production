import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CommentsPolicyService } from './comments-policy.service';
import { MentionService } from './mention.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentsQueryDto } from './dto/comments-query.dto';
import {
  CommentDto,
  CommentLikeResponseDto,
  PaginatedCommentsResponseDto,
} from './dto/comment-response.dto';
import { CommentStatus, NotificationType, Prisma } from '@prisma/client';

interface DecodedCursor {
  createdAt: string;
  id: string;
}

interface CommentWithRelations {
  id: string;
  postId: string | null;
  reelId: string | null;
  authorId: string;
  parentId: string | null;
  rootId: string | null;
  content: string;
  status: CommentStatus;
  deletedAt: Date | null;
  repliesCount: number;
  likesCount: number;
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
  mentions: Array<{
    mentionedUserId: string;
    username: string;
  }>;
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commentsPolicy: CommentsPolicyService,
    private readonly mentionService: MentionService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Encodes a stable cursor into a base64url string (createdAt ASC, id ASC)
   */
  private encodeCursor(createdAt: Date, id: string): string {
    const payload: DecodedCursor = {
      createdAt: createdAt.toISOString(),
      id,
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
   * Maps a DB comment record into the public API DTO with tombstone semantics
   */
  private formatCommentItem(
    comment: CommentWithRelations,
    viewerId: string,
    viewerLiked: boolean,
  ): CommentDto {
    const isDeleted = comment.status === CommentStatus.DELETED;
    const canModify = this.commentsPolicy.canModifyComment(viewerId, comment);

    if (isDeleted) {
      return {
        id: comment.id,
        postId: comment.postId,
        reelId: comment.reelId,
        parentId: comment.parentId,
        rootId: comment.rootId,
        author: null,
        content: null,
        status: CommentStatus.DELETED,
        isDeleted: true,
        mentions: [],
        stats: {
          repliesCount: comment.repliesCount,
          likesCount: 0,
        },
        viewer: {
          hasLiked: false,
          canEdit: false,
          canDelete: false,
        },
        editedAt: null,
        createdAt: comment.createdAt.toISOString(),
      };
    }

    return {
      id: comment.id,
      postId: comment.postId,
      reelId: comment.reelId,
      parentId: comment.parentId,
      rootId: comment.rootId,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        displayName: comment.author.displayName || comment.author.username,
        avatarUrl: comment.author.avatarUrl,
        isVerified: comment.author.isVerified,
        isPremium: comment.author.isPremium,
      },
      content: comment.content,
      status: comment.status,
      isDeleted: false,
      mentions: comment.mentions.map((m) => ({
        userId: m.mentionedUserId,
        username: m.username,
      })),
      stats: {
        repliesCount: comment.repliesCount,
        likesCount: comment.likesCount,
      },
      viewer: {
        hasLiked: viewerLiked,
        canEdit: canModify,
        canDelete: canModify,
      },
      editedAt: comment.editedAt ? comment.editedAt.toISOString() : null,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  /**
   * Create a new top-level comment on a post
   */
  async createComment(
    userId: string,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    await this.commentsPolicy.assertCanAccessPost(userId, postId);

    const content = dto.content ? dto.content.trim() : '';
    if (!content) {
      throw new BadRequestException({
        code: 'COMMENT_INVALID_CONTENT',
        message: 'Comment content cannot be empty',
      });
    }

    const resolvedMentions = await this.mentionService.resolveMentions(
      userId,
      content,
    );

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          postId,
          authorId: userId,
          content,
          status: CommentStatus.PUBLISHED,
          mentions: {
            createMany: {
              data: resolvedMentions.map((m) => ({
                mentionedUserId: m.userId,
                username: m.username,
              })),
            },
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
          mentions: {
            select: {
              mentionedUserId: true,
              username: true,
            },
          },
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          commentsCount: { increment: 1 },
        },
      });

      return created;
    });

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (post) {
      await this.notificationsService.createNotification({
        recipientId: post.authorId,
        actorId: userId,
        type: NotificationType.COMMENT_POST,
        entityId: postId,
        entityType: 'POST',
        metadata: {
          commentId: comment.id,
          previewText: content.slice(0, 80),
        },
      });
    }

    for (const m of resolvedMentions) {
      await this.notificationsService.createNotification({
        recipientId: m.userId,
        actorId: userId,
        type: NotificationType.MENTION_COMMENT,
        entityId: postId,
        entityType: 'COMMENT',
        metadata: {
          commentId: comment.id,
          previewText: content.slice(0, 80),
        },
      });
    }

    return this.formatCommentItem(comment, userId, false);
  }

  /**
   * Create a new top-level comment on a Reel
   */
  async createReelComment(
    userId: string,
    reelId: string,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    await this.commentsPolicy.assertCanAccessReel(userId, reelId);

    const content = dto.content ? dto.content.trim() : '';
    if (!content) {
      throw new BadRequestException({
        code: 'COMMENT_INVALID_CONTENT',
        message: 'Comment content cannot be empty',
      });
    }

    const resolvedMentions = await this.mentionService.resolveMentions(
      userId,
      content,
    );

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          reelId,
          authorId: userId,
          content,
          status: CommentStatus.PUBLISHED,
          mentions: {
            createMany: {
              data: resolvedMentions.map((m) => ({
                mentionedUserId: m.userId,
                username: m.username,
              })),
            },
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
          mentions: {
            select: {
              mentionedUserId: true,
              username: true,
            },
          },
        },
      });

      await tx.reel.update({
        where: { id: reelId },
        data: {
          commentsCount: { increment: 1 },
        },
      });

      return created;
    });

    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
      select: { authorId: true },
    });

    if (reel && reel.authorId !== userId) {
      await this.notificationsService.createNotification({
        recipientId: reel.authorId,
        actorId: userId,
        type: NotificationType.REEL_COMMENT,
        entityId: reelId,
        entityType: 'REEL',
        metadata: {
          commentId: comment.id,
          previewText: content.slice(0, 80),
        },
      });
    }

    for (const m of resolvedMentions) {
      if (m.userId !== userId) {
        await this.notificationsService.createNotification({
          recipientId: m.userId,
          actorId: userId,
          type: NotificationType.MENTION_COMMENT,
          entityId: reelId,
          entityType: 'COMMENT',
          metadata: {
            commentId: comment.id,
            reelId,
            previewText: content.slice(0, 80),
          },
        });
      }
    }

    return this.formatCommentItem(comment, userId, false);
  }

  /**
   * Create a reply to an existing comment (supporting 2-tier root thread structure)
   */
  async createReply(
    userId: string,
    commentId: string,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    const parentComment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!parentComment) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }

    if (parentComment.postId) {
      await this.commentsPolicy.assertCanAccessPost(
        userId,
        parentComment.postId,
      );
    } else if (parentComment.reelId) {
      await this.commentsPolicy.assertCanAccessReel(
        userId,
        parentComment.reelId,
      );
    }

    const content = dto.content ? dto.content.trim() : '';
    if (!content) {
      throw new BadRequestException({
        code: 'COMMENT_INVALID_CONTENT',
        message: 'Reply content cannot be empty',
      });
    }

    // Determine root comment ID:
    // If parent is top-level (parentId === null), rootId = parent.id
    // If parent is a reply, rootId = parent.rootId || parent.parentId
    const rootId =
      parentComment.parentId === null
        ? parentComment.id
        : parentComment.rootId || parentComment.parentId;

    const resolvedMentions = await this.mentionService.resolveMentions(
      userId,
      content,
    );

    const reply = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          postId: parentComment.postId,
          reelId: parentComment.reelId,
          authorId: userId,
          parentId: parentComment.id,
          rootId,
          content,
          status: CommentStatus.PUBLISHED,
          mentions: {
            createMany: {
              data: resolvedMentions.map((m) => ({
                mentionedUserId: m.userId,
                username: m.username,
              })),
            },
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
          mentions: {
            select: {
              mentionedUserId: true,
              username: true,
            },
          },
        },
      });

      // Increment Post or Reel total comments counter
      if (parentComment.postId) {
        await tx.post.update({
          where: { id: parentComment.postId },
          data: { commentsCount: { increment: 1 } },
        });
      } else if (parentComment.reelId) {
        await tx.reel.update({
          where: { id: parentComment.reelId },
          data: { commentsCount: { increment: 1 } },
        });
      }

      // Increment Root comment replies count
      if (rootId) {
        await tx.comment.update({
          where: { id: rootId },
          data: { repliesCount: { increment: 1 } },
        });
      }

      // If parent is distinct from root, also increment parent repliesCount
      if (parentComment.id !== rootId) {
        await tx.comment.update({
          where: { id: parentComment.id },
          data: { repliesCount: { increment: 1 } },
        });
      }

      return created;
    });

    if (parentComment.authorId !== userId) {
      void this.notificationsService.createNotification({
        recipientId: parentComment.authorId,
        actorId: userId,
        type: NotificationType.REPLY_COMMENT,
        entityId: parentComment.postId || parentComment.reelId || reply.id,
        entityType: parentComment.reelId ? 'REEL' : 'COMMENT',
        metadata: {
          commentId: reply.id,
          reelId: parentComment.reelId || undefined,
          postId: parentComment.postId || undefined,
          previewText: content.slice(0, 80),
        },
      });
    }

    for (const m of resolvedMentions) {
      if (m.userId !== userId) {
        await this.notificationsService.createNotification({
          recipientId: m.userId,
          actorId: userId,
          type: NotificationType.MENTION_COMMENT,
          entityId: parentComment.postId || parentComment.reelId || reply.id,
          entityType: parentComment.reelId ? 'REEL' : 'COMMENT',
          metadata: {
            commentId: reply.id,
            reelId: parentComment.reelId || undefined,
            postId: parentComment.postId || undefined,
            previewText: content.slice(0, 80),
          },
        });
      }
    }

    return this.formatCommentItem(reply, userId, false);
  }

  /**
   * Get cursor-paginated top-level comments for a post
   */
  async getPostComments(
    userId: string,
    postId: string,
    query: CommentsQueryDto,
  ): Promise<PaginatedCommentsResponseDto> {
    await this.commentsPolicy.assertCanAccessPost(userId, postId);

    const limit = query.limit || 20;
    const decodedCursor = this.decodeCursor(query.cursor);

    const where: Prisma.CommentWhereInput = {
      postId,
      parentId: null, // Top-level only
    };

    if (decodedCursor) {
      const cursorDate = new Date(decodedCursor.createdAt);
      where.OR = [
        { createdAt: { gt: cursorDate } },
        {
          createdAt: cursorDate,
          id: { gt: decodedCursor.id },
        },
      ];
    }

    const comments = await this.prisma.comment.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
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
        mentions: {
          select: {
            mentionedUserId: true,
            username: true,
          },
        },
      },
    });

    const hasNextPage = comments.length > limit;
    const items = hasNextPage ? comments.slice(0, limit) : comments;

    // Batch query viewer likes
    const commentIds = items.map((c) => c.id);
    const viewerLikes = await this.prisma.commentLike.findMany({
      where: {
        userId,
        commentId: { in: commentIds },
      },
      select: { commentId: true },
    });
    const likedCommentIds = new Set(viewerLikes.map((l) => l.commentId));

    const formattedItems = items.map((c) =>
      this.formatCommentItem(c, userId, likedCommentIds.has(c.id)),
    );

    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = this.encodeCursor(lastItem.createdAt, lastItem.id);
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
   * Get cursor-paginated top-level comments for a Reel
   */
  async getReelComments(
    userId: string,
    reelId: string,
    query: CommentsQueryDto,
  ): Promise<PaginatedCommentsResponseDto> {
    await this.commentsPolicy.assertCanAccessReel(userId, reelId);

    const limit = query.limit || 20;
    const decodedCursor = this.decodeCursor(query.cursor);

    const where: Prisma.CommentWhereInput = {
      reelId,
      parentId: null, // Top-level only
    };

    if (decodedCursor) {
      const cursorDate = new Date(decodedCursor.createdAt);
      where.OR = [
        { createdAt: { gt: cursorDate } },
        {
          createdAt: cursorDate,
          id: { gt: decodedCursor.id },
        },
      ];
    }

    const comments = await this.prisma.comment.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
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
        mentions: {
          select: {
            mentionedUserId: true,
            username: true,
          },
        },
      },
    });

    const hasNextPage = comments.length > limit;
    const items = hasNextPage ? comments.slice(0, limit) : comments;

    // Batch query viewer likes
    const commentIds = items.map((c) => c.id);
    const viewerLikes = await this.prisma.commentLike.findMany({
      where: {
        userId,
        commentId: { in: commentIds },
      },
      select: { commentId: true },
    });
    const likedCommentIds = new Set(viewerLikes.map((l) => l.commentId));

    const formattedItems = items.map((c) =>
      this.formatCommentItem(c, userId, likedCommentIds.has(c.id)),
    );

    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = this.encodeCursor(lastItem.createdAt, lastItem.id);
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
   * Get cursor-paginated replies for a specific comment thread
   */
  async getCommentReplies(
    userId: string,
    commentId: string,
    query: CommentsQueryDto,
  ): Promise<PaginatedCommentsResponseDto> {
    const parentComment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!parentComment) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }

    if (parentComment.postId) {
      await this.commentsPolicy.assertCanAccessPost(
        userId,
        parentComment.postId,
      );
    } else if (parentComment.reelId) {
      await this.commentsPolicy.assertCanAccessReel(
        userId,
        parentComment.reelId,
      );
    }

    const limit = query.limit || 20;
    const decodedCursor = this.decodeCursor(query.cursor);

    // Query all replies belonging to this thread (either parentId = commentId or rootId = commentId)
    const where: Prisma.CommentWhereInput = {
      OR: [{ parentId: commentId }, { rootId: commentId }],
    };

    if (decodedCursor) {
      const cursorDate = new Date(decodedCursor.createdAt);
      where.AND = [
        {
          OR: [
            { createdAt: { gt: cursorDate } },
            {
              createdAt: cursorDate,
              id: { gt: decodedCursor.id },
            },
          ],
        },
      ];
    }

    const replies = await this.prisma.comment.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
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
        mentions: {
          select: {
            mentionedUserId: true,
            username: true,
          },
        },
      },
    });

    const hasNextPage = replies.length > limit;
    const items = hasNextPage ? replies.slice(0, limit) : replies;

    // Batch query viewer likes
    const replyIds = items.map((r) => r.id);
    const viewerLikes = await this.prisma.commentLike.findMany({
      where: {
        userId,
        commentId: { in: replyIds },
      },
      select: { commentId: true },
    });
    const likedReplyIds = new Set(viewerLikes.map((l) => l.commentId));

    const formattedItems = items.map((r) =>
      this.formatCommentItem(r, userId, likedReplyIds.has(r.id)),
    );

    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = this.encodeCursor(lastItem.createdAt, lastItem.id);
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
   * Update comment content (author only)
   */
  async updateComment(
    userId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
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
        mentions: {
          select: {
            mentionedUserId: true,
            username: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }

    this.commentsPolicy.assertCanModifyComment(userId, comment);

    if (comment.status === CommentStatus.DELETED) {
      throw new BadRequestException({
        code: 'COMMENT_DELETED',
        message: 'Cannot edit a deleted comment',
      });
    }

    const content = dto.content ? dto.content.trim() : '';
    if (!content) {
      throw new BadRequestException({
        code: 'COMMENT_INVALID_CONTENT',
        message: 'Comment content cannot be empty',
      });
    }

    const resolvedMentions = await this.mentionService.resolveMentions(
      userId,
      content,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      // Reconcile mentions
      await tx.commentMention.deleteMany({
        where: { commentId },
      });

      if (resolvedMentions.length > 0) {
        await tx.commentMention.createMany({
          data: resolvedMentions.map((m) => ({
            commentId,
            mentionedUserId: m.userId,
            username: m.username,
          })),
        });
      }

      return tx.comment.update({
        where: { id: commentId },
        data: {
          content,
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
          mentions: {
            select: {
              mentionedUserId: true,
              username: true,
            },
          },
        },
      });
    });

    const isLiked = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: { userId, commentId },
      },
    });

    return this.formatCommentItem(updated, userId, !!isLiked);
  }

  /**
   * Delete comment with tombstone semantics if replies exist, or full cleanup if leaf
   */
  async deleteComment(
    userId: string,
    commentId: string,
  ): Promise<{ message: string }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }

    this.commentsPolicy.assertCanModifyComment(userId, comment);

    if (comment.status === CommentStatus.DELETED) {
      return { message: 'Comment already deleted' };
    }

    await this.prisma.$transaction(async (tx) => {
      // If comment has surviving replies, keep record as tombstone so conversation thread is preserved
      if (comment.repliesCount > 0) {
        await tx.comment.update({
          where: { id: commentId },
          data: {
            status: CommentStatus.DELETED,
            deletedAt: new Date(),
            content: '',
          },
        });
        await tx.commentMention.deleteMany({
          where: { commentId },
        });
      } else {
        // Leaf comment with 0 replies: can mark deleted or delete
        await tx.comment.update({
          where: { id: commentId },
          data: {
            status: CommentStatus.DELETED,
            deletedAt: new Date(),
            content: '',
          },
        });
        await tx.commentMention.deleteMany({
          where: { commentId },
        });

        // Decrement parent repliesCount if this was a reply
        if (comment.parentId) {
          await tx.comment.update({
            where: { id: comment.parentId },
            data: { repliesCount: { decrement: 1 } },
          });
        }
        if (comment.rootId && comment.rootId !== comment.parentId) {
          await tx.comment.update({
            where: { id: comment.rootId },
            data: { repliesCount: { decrement: 1 } },
          });
        }
      }

      // Decrement Post or Reel total comments count safely (non-negative)
      if (comment.postId) {
        const post = await tx.post.findUnique({
          where: { id: comment.postId },
          select: { commentsCount: true },
        });

        if (post && post.commentsCount > 0) {
          await tx.post.update({
            where: { id: comment.postId },
            data: { commentsCount: { decrement: 1 } },
          });
        }
      } else if (comment.reelId) {
        const reel = await tx.reel.findUnique({
          where: { id: comment.reelId },
          select: { commentsCount: true },
        });

        if (reel && reel.commentsCount > 0) {
          await tx.reel.update({
            where: { id: comment.reelId },
            data: { commentsCount: { decrement: 1 } },
          });
        }
      }
    });

    return { message: 'Comment deleted successfully' };
  }

  /**
   * Idempotently like a comment
   */
  async likeComment(
    userId: string,
    commentId: string,
  ): Promise<CommentLikeResponseDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.status === CommentStatus.DELETED) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Comment not found or is deleted',
      });
    }

    if (comment.postId) {
      await this.commentsPolicy.assertCanAccessPost(userId, comment.postId);
    } else if (comment.reelId) {
      await this.commentsPolicy.assertCanAccessReel(userId, comment.reelId);
    }

    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: { userId, commentId },
      },
    });

    if (existingLike) {
      return {
        hasLiked: true,
        likesCount: comment.likesCount,
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.commentLike.create({
        data: { userId, commentId },
      });

      return tx.comment.update({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } },
        select: { likesCount: true },
      });
    });

    await this.notificationsService.createNotification({
      recipientId: comment.authorId,
      actorId: userId,
      type: NotificationType.LIKE_COMMENT,
      entityId: comment.id,
      entityType: 'COMMENT',
      metadata: {
        previewText: comment.content ? comment.content.slice(0, 80) : undefined,
      },
    });

    return {
      hasLiked: true,
      likesCount: updated.likesCount,
    };
  }

  /**
   * Idempotently unlike a comment
   */
  async unlikeComment(
    userId: string,
    commentId: string,
  ): Promise<CommentLikeResponseDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.status === CommentStatus.DELETED) {
      throw new NotFoundException({
        code: 'COMMENT_NOT_FOUND',
        message: 'Comment not found or is deleted',
      });
    }

    if (comment.postId) {
      await this.commentsPolicy.assertCanAccessPost(userId, comment.postId);
    } else if (comment.reelId) {
      await this.commentsPolicy.assertCanAccessReel(userId, comment.reelId);
    }

    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: { userId, commentId },
      },
    });

    if (!existingLike) {
      return {
        hasLiked: false,
        likesCount: comment.likesCount,
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.commentLike.delete({
        where: {
          userId_commentId: { userId, commentId },
        },
      });

      const nextLikesCount = Math.max(0, comment.likesCount - 1);
      return tx.comment.update({
        where: { id: commentId },
        data: { likesCount: nextLikesCount },
        select: { likesCount: true },
      });
    });

    return {
      hasLiked: false,
      likesCount: updated.likesCount,
    };
  }

  /**
   * Reconciles Post and Comment counter values against actual database rows
   */
  async reconcileCounters(postId: string): Promise<number> {
    const activeCommentsCount = await this.prisma.comment.count({
      where: {
        postId,
        status: CommentStatus.PUBLISHED,
      },
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: activeCommentsCount },
    });

    return activeCommentsCount;
  }
}
