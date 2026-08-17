import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PostVisibility, PostStatus } from '@prisma/client';

@Injectable()
export class ReelsPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns a set of all user IDs that have a blocking or muting relationship with viewerId
   */
  async getBlockedUserIds(viewerId: string): Promise<Set<string>> {
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

    const excludedSet = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === viewerId) excludedSet.add(b.blockedId);
      if (b.blockedId === viewerId) excludedSet.add(b.blockerId);
    }
    for (const m of mutes) {
      excludedSet.add(m.mutedId);
    }
    return excludedSet;
  }

  /**
   * Asserts viewer has permission to access a Reel.
   * Throws NotFoundException on block/non-existence to prevent discovery, or ForbiddenException on privacy boundaries.
   */
  async assertCanAccessReel(
    viewerId: string,
    reelId: string,
  ): Promise<{
    id: string;
    authorId: string;
    visibility: PostVisibility;
    status: PostStatus;
    author: {
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isPrivate: boolean;
      isVerified: boolean;
      isPremium: boolean;
    };
  }> {
    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isPrivate: true,
            isVerified: true,
            isPremium: true,
          },
        },
      },
    });

    if (
      !reel ||
      reel.status === PostStatus.DELETED ||
      reel.status === PostStatus.REMOVED_BY_MODERATION ||
      reel.deletedAt
    ) {
      throw new NotFoundException({
        code: 'REEL_NOT_FOUND',
        message: 'Reel not found or has been deleted',
      });
    }

    if (reel.authorId === viewerId) {
      return reel;
    }

    // Check block boundary in both directions
    const isBlocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: reel.authorId },
          { blockerId: reel.authorId, blockedId: viewerId },
        ],
      },
    });

    if (isBlocked) {
      throw new NotFoundException({
        code: 'REEL_NOT_FOUND',
        message: 'Reel not found',
      });
    }

    // Check visibility scopes
    if (reel.visibility === PostVisibility.CLOSE_FRIENDS) {
      const isCloseFriend = await this.prisma.closeFriend.findUnique({
        where: {
          userId_friendId: {
            userId: reel.authorId,
            friendId: viewerId,
          },
        },
      });
      if (!isCloseFriend) {
        throw new ForbiddenException({
          code: 'REEL_AUDIENCE_RESTRICTED',
          message: 'This Reel is restricted to close friends',
        });
      }
    } else if (
      reel.visibility === PostVisibility.FOLLOWERS ||
      reel.author.isPrivate
    ) {
      const isFollower = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: reel.authorId,
          },
        },
      });
      if (!isFollower) {
        throw new ForbiddenException({
          code: 'REEL_PRIVATE_ACCOUNT',
          message: 'Follow this creator to view their Reels',
        });
      }
    }

    return reel;
  }

  /**
   * Asserts user has permission to delete a Reel (Author only)
   */
  assertCanDelete(userId: string, reel: { authorId: string }): void {
    if (reel.authorId !== userId) {
      throw new ForbiddenException({
        code: 'REEL_DELETE_UNAUTHORIZED',
        message: 'You are not authorized to delete this Reel',
      });
    }
  }
}
