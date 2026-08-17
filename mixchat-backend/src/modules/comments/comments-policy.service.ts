import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PostsPolicyService } from '../posts/posts-policy.service';
import { PostStatus, Comment, Post } from '@prisma/client';

@Injectable()
export class CommentsPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postsPolicy: PostsPolicyService,
  ) {}

  /**
   * Asserts that a user has permission to view/interact with the post owning comments
   */
  async assertCanAccessPost(userId: string, postId: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.status === PostStatus.DELETED) {
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found or is unavailable',
      });
    }

    await this.postsPolicy.assertCanView(userId, post);
    return post;
  }

  /**
   * Asserts that a user has permission to view/interact with the reel owning comments
   */
  async assertCanAccessReel(userId: string, reelId: string): Promise<any> {
    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            isPrivate: true,
          },
        },
      },
    });

    if (!reel || reel.status === PostStatus.DELETED || reel.deletedAt) {
      throw new NotFoundException({
        code: 'REEL_NOT_FOUND',
        message: 'Reel not found or is unavailable',
      });
    }

    if (reel.authorId === userId) return reel;

    const isBlocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: reel.authorId },
          { blockerId: reel.authorId, blockedId: userId },
        ],
      },
    });

    if (isBlocked) {
      throw new NotFoundException({
        code: 'REEL_NOT_FOUND',
        message: 'Reel not found',
      });
    }

    if (reel.author.isPrivate) {
      const isFollower = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: reel.authorId,
          },
        },
      });
      if (!isFollower) {
        throw new ForbiddenException({
          code: 'REEL_PRIVATE_ACCOUNT',
          message: 'Follow this creator to view and comment on their Reels',
        });
      }
    }

    return reel;
  }

  /**
   * Asserts that the caller is the author of the comment
   */
  assertCanModifyComment(
    userId: string,
    comment: Pick<Comment, 'authorId' | 'status'>,
  ): void {
    if (comment.authorId !== userId) {
      throw new ForbiddenException({
        code: 'COMMENT_FORBIDDEN',
        message: 'You are not authorized to modify this comment',
      });
    }
  }

  /**
   * Evaluates if caller can edit or delete a comment
   */
  canModifyComment(
    userId: string,
    comment: Pick<Comment, 'authorId'>,
  ): boolean {
    return comment.authorId === userId;
  }
}
