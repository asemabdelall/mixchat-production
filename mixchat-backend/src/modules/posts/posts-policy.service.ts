import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SocialPolicyService } from '../social/social-policy.service';
import { Post, PostVisibility, PostStatus } from '@prisma/client';

@Injectable()
export class PostsPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socialPolicy: SocialPolicyService,
  ) {}

  /**
   * Determine if viewer is allowed to view a specific post
   */
  async canViewPost(viewerId: string, post: Post): Promise<boolean> {
    if (post.status === PostStatus.DELETED) {
      return false;
    }

    if (post.status === PostStatus.ARCHIVED && post.authorId !== viewerId) {
      return false;
    }

    // Owner can always view their own posts
    if (post.authorId === viewerId) {
      return true;
    }

    // Block boundary
    const { isBlocked } = await this.socialPolicy.isBlockedEitherDirection(
      viewerId,
      post.authorId,
    );
    if (isBlocked) {
      return false;
    }

    // Check post-specific visibility
    if (post.visibility === PostVisibility.CLOSE_FRIENDS) {
      return await this.socialPolicy.isCloseFriend(post.authorId, viewerId);
    }

    if (post.visibility === PostVisibility.FOLLOWERS) {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: post.authorId,
          },
        },
      });
      return !!follow;
    }

    // For PUBLIC posts, respect author account privacy
    return await this.socialPolicy.canViewProtectedContent(
      viewerId,
      post.authorId,
    );
  }

  /**
   * Assert viewer can view post, otherwise throw NotFoundException or ForbiddenException
   */
  async assertCanView(viewerId: string, post: Post): Promise<void> {
    const allowed = await this.canViewPost(viewerId, post);
    if (!allowed) {
      // Conceal existence of private / blocked posts
      throw new NotFoundException({
        code: 'POST_NOT_FOUND',
        message: 'Post not found or unavailable',
      });
    }
  }

  /**
   * Assert viewer can modify (edit/delete) post
   */
  assertCanModify(viewerId: string, post: Post): void {
    if (post.authorId !== viewerId) {
      throw new ForbiddenException({
        code: 'POST_FORBIDDEN',
        message: 'You are not authorized to modify this post',
      });
    }
  }
}
