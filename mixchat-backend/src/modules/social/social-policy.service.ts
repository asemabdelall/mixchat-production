import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RelationshipState } from '@prisma/client';

export interface RelationshipSnapshot {
  relationshipState: RelationshipState;
  isCloseFriend: boolean;
}

@Injectable()
export class SocialPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if either user has blocked the other
   */
  async isBlockedEitherDirection(
    userAId: string,
    userBId: string,
  ): Promise<{ blockedByA: boolean; blockedByB: boolean; isBlocked: boolean }> {
    if (userAId === userBId) {
      return { blockedByA: false, blockedByB: false, isBlocked: false };
    }

    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
    });

    const blockedByA = blocks.some((b) => b.blockerId === userAId);
    const blockedByB = blocks.some((b) => b.blockerId === userBId);

    return {
      blockedByA,
      blockedByB,
      isBlocked: blockedByA || blockedByB,
    };
  }

  /**
   * Assert interaction (follow, message, request, etc.) is allowed between two users
   */
  async assertCanInteract(actorId: string, targetId: string): Promise<void> {
    if (actorId === targetId) {
      throw new ForbiddenException(
        'Cannot perform this social action on yourself',
      );
    }

    const { isBlocked } = await this.isBlockedEitherDirection(
      actorId,
      targetId,
    );
    if (isBlocked) {
      throw new ForbiddenException(
        'Cannot interact with this user due to block restrictions',
      );
    }
  }

  /**
   * Get accurate relationship state between viewer and target user
   */
  async getRelationshipState(
    viewerId: string,
    targetId: string,
  ): Promise<RelationshipState> {
    if (viewerId === targetId) {
      return RelationshipState.SELF;
    }

    const { blockedByA, blockedByB } = await this.isBlockedEitherDirection(
      viewerId,
      targetId,
    );

    if (blockedByA) {
      return RelationshipState.BLOCKED;
    }
    if (blockedByB) {
      return RelationshipState.BLOCKED_BY;
    }

    // Check follows in both directions and pending requests
    const [viewerFollowsTarget, targetFollowsViewer, pendingRequest] =
      await Promise.all([
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: targetId,
            },
          },
        }),
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: targetId,
              followingId: viewerId,
            },
          },
        }),
        this.prisma.followRequest.findUnique({
          where: {
            requesterId_targetId: {
              requesterId: viewerId,
              targetId: targetId,
            },
          },
        }),
      ]);

    if (viewerFollowsTarget && targetFollowsViewer) {
      return RelationshipState.MUTUAL;
    }
    if (viewerFollowsTarget) {
      return RelationshipState.FOLLOWING;
    }
    if (pendingRequest) {
      return RelationshipState.REQUESTED;
    }
    if (targetFollowsViewer) {
      return RelationshipState.FOLLOWED_BY;
    }

    return RelationshipState.NONE;
  }

  /**
   * Resolve relationship and Close Friends state for a whole response page.
   * The query count is constant (four batched queries), regardless of whether
   * the page contains 20 or 50 users.
   */
  async getRelationshipSnapshots(
    viewerId: string,
    targetIds: string[],
  ): Promise<Map<string, RelationshipSnapshot>> {
    const uniqueTargetIds = [...new Set(targetIds)].slice(0, 100);
    const otherIds = uniqueTargetIds.filter((id) => id !== viewerId);
    const result = new Map<string, RelationshipSnapshot>();

    if (uniqueTargetIds.includes(viewerId)) {
      result.set(viewerId, {
        relationshipState: RelationshipState.SELF,
        isCloseFriend: true,
      });
    }
    if (otherIds.length === 0) return result;

    const [blocks, follows, pendingRequests, closeFriends] = await Promise.all([
      this.prisma.block.findMany({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: { in: otherIds } },
            { blockerId: { in: otherIds }, blockedId: viewerId },
          ],
        },
        select: { blockerId: true, blockedId: true },
      }),
      this.prisma.follow.findMany({
        where: {
          OR: [
            { followerId: viewerId, followingId: { in: otherIds } },
            { followerId: { in: otherIds }, followingId: viewerId },
          ],
        },
        select: { followerId: true, followingId: true },
      }),
      this.prisma.followRequest.findMany({
        where: { requesterId: viewerId, targetId: { in: otherIds } },
        select: { targetId: true },
      }),
      this.prisma.closeFriend.findMany({
        where: { userId: viewerId, friendId: { in: otherIds } },
        select: { friendId: true },
      }),
    ]);

    const blockedByViewer = new Set(
      blocks
        .filter((block) => block.blockerId === viewerId)
        .map((block) => block.blockedId),
    );
    const viewerBlockedBy = new Set(
      blocks
        .filter((block) => block.blockedId === viewerId)
        .map((block) => block.blockerId),
    );
    const viewerFollowing = new Set(
      follows
        .filter((follow) => follow.followerId === viewerId)
        .map((follow) => follow.followingId),
    );
    const followedBy = new Set(
      follows
        .filter((follow) => follow.followingId === viewerId)
        .map((follow) => follow.followerId),
    );
    const requested = new Set(pendingRequests.map((item) => item.targetId));
    const closeFriendIds = new Set(closeFriends.map((item) => item.friendId));

    for (const targetId of otherIds) {
      let relationshipState: RelationshipState = RelationshipState.NONE;
      if (blockedByViewer.has(targetId)) {
        relationshipState = RelationshipState.BLOCKED;
      } else if (viewerBlockedBy.has(targetId)) {
        relationshipState = RelationshipState.BLOCKED_BY;
      } else if (viewerFollowing.has(targetId) && followedBy.has(targetId)) {
        relationshipState = RelationshipState.MUTUAL;
      } else if (viewerFollowing.has(targetId)) {
        relationshipState = RelationshipState.FOLLOWING;
      } else if (requested.has(targetId)) {
        relationshipState = RelationshipState.REQUESTED;
      } else if (followedBy.has(targetId)) {
        relationshipState = RelationshipState.FOLLOWED_BY;
      }
      result.set(targetId, {
        relationshipState,
        isCloseFriend: closeFriendIds.has(targetId),
      });
    }

    return result;
  }

  /**
   * Check if viewer is in owner's close friends list
   */
  async isCloseFriend(ownerId: string, viewerId: string): Promise<boolean> {
    if (ownerId === viewerId) return true;

    const closeFriend = await this.prisma.closeFriend.findUnique({
      where: {
        userId_friendId: {
          userId: ownerId,
          friendId: viewerId,
        },
      },
    });

    return !!closeFriend;
  }

  /**
   * Check if viewer is allowed to view protected content (posts, reels, stories) of target
   */
  async canViewProtectedContent(
    viewerId: string,
    targetId: string,
  ): Promise<boolean> {
    if (viewerId === targetId) return true;

    const { isBlocked } = await this.isBlockedEitherDirection(
      viewerId,
      targetId,
    );
    if (isBlocked) return false;

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { isPrivate: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (!targetUser.isPrivate) {
      return true;
    }

    // For private users, viewer must have active follow relationship
    const isFollowing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: targetId,
        },
      },
    });

    return !!isFollowing;
  }
}
