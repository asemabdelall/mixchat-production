import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Story, StoryAudience, StoryStatus, User } from '@prisma/client';

export type StoryWithAuthor = Story & {
  author: Pick<User, 'id' | 'isPrivate'>;
};

@Injectable()
export class StoriesPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Asserts whether a viewer is allowed to view an active story
   */
  async assertCanViewStory(
    story: StoryWithAuthor,
    viewerId: string,
    isArchiveContext = false,
  ): Promise<void> {
    // 1. Author can always view their own story
    if (story.authorId === viewerId) {
      if (story.status === StoryStatus.DELETED) {
        throw new NotFoundException({
          code: 'STORY_NOT_FOUND',
          message: 'Story not found or has been deleted',
        });
      }
      return;
    }

    // 2. Deleted stories are never accessible to other viewers
    if (story.status === StoryStatus.DELETED) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found or has been deleted',
      });
    }

    // 3. Expired stories are not accessible to non-authors
    if (story.status === StoryStatus.EXPIRED || story.expiresAt <= new Date()) {
      throw new NotFoundException({
        code: 'STORY_EXPIRED',
        message: 'Story has expired',
      });
    }

    // 4. In archive context, non-authors cannot view
    if (isArchiveContext) {
      throw new ForbiddenException({
        code: 'STORY_ARCHIVE_FORBIDDEN',
        message: 'You can only view your own story archive',
      });
    }

    // 5. Block verification in both directions
    const blockExists = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: story.authorId },
          { blockerId: story.authorId, blockedId: viewerId },
        ],
      },
    });

    if (blockExists) {
      throw new NotFoundException({
        code: 'STORY_NOT_FOUND',
        message: 'Story not found',
      });
    }

    // 6. Audience & Privacy Policy
    if (story.audience === StoryAudience.CLOSE_FRIENDS) {
      const isCloseFriend = await this.prisma.closeFriend.findUnique({
        where: {
          userId_friendId: {
            userId: story.authorId,
            friendId: viewerId,
          },
        },
      });

      if (!isCloseFriend) {
        throw new ForbiddenException({
          code: 'STORY_CLOSE_FRIENDS_ONLY',
          message: 'This story is restricted to Close Friends only',
        });
      }
      return;
    }

    if (story.audience === StoryAudience.FOLLOWERS || story.author.isPrivate) {
      const isFollowing = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: story.authorId,
          },
        },
      });

      if (!isFollowing) {
        throw new ForbiddenException({
          code: 'STORY_FOLLOWERS_ONLY',
          message: 'This story is only accessible to approved followers',
        });
      }
      return;
    }

    // Story is PUBLIC and author is not private
  }

  /**
   * Asserts whether a viewer can react to a story
   */
  async assertCanReact(
    story: StoryWithAuthor,
    viewerId: string,
  ): Promise<void> {
    if (story.authorId === viewerId) {
      throw new ForbiddenException({
        code: 'STORY_SELF_INTERACTION',
        message: 'You cannot react to your own story',
      });
    }

    await this.assertCanViewStory(story, viewerId);
  }

  /**
   * Asserts whether a viewer can reply to a story
   */
  async assertCanReply(
    story: StoryWithAuthor,
    viewerId: string,
  ): Promise<void> {
    if (story.authorId === viewerId) {
      throw new ForbiddenException({
        code: 'STORY_SELF_INTERACTION',
        message: 'You cannot reply to your own story',
      });
    }

    await this.assertCanViewStory(story, viewerId);
  }

  /**
   * Asserts whether user can view the viewers list (Author only)
   */
  assertCanViewViewersList(storyAuthorId: string, userId: string): void {
    if (storyAuthorId !== userId) {
      throw new ForbiddenException({
        code: 'STORY_VIEWERS_FORBIDDEN',
        message: 'Only the story author can view the viewers list',
      });
    }
  }

  /**
   * Asserts whether user can view replies (Author only)
   */
  assertCanViewReplies(storyAuthorId: string, userId: string): void {
    if (storyAuthorId !== userId) {
      throw new ForbiddenException({
        code: 'STORY_REPLIES_FORBIDDEN',
        message: 'Only the story author can view story replies',
      });
    }
  }

  /**
   * Asserts whether user can delete the story (Author only)
   */
  assertCanDelete(storyAuthorId: string, userId: string): void {
    if (storyAuthorId !== userId) {
      throw new ForbiddenException({
        code: 'STORY_DELETE_FORBIDDEN',
        message: 'You can only delete your own stories',
      });
    }
  }
}
