import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SocialPolicyService } from '../social/social-policy.service';
import { LocationVisibility, UserLocationSettings } from '@prisma/client';

@Injectable()
export class LocationVisibilityPolicy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socialPolicy: SocialPolicyService,
  ) {}

  /**
   * Determine whether a viewer is authorized to view a target user's location.
   */
  async canViewerSeeTargetLocation(
    viewerId: string,
    targetUserId: string,
    targetSettings: Pick<UserLocationSettings, 'isGhostMode' | 'visibility'>,
  ): Promise<boolean> {
    if (viewerId === targetUserId) {
      return true;
    }

    // Ghost mode hides location completely
    if (
      targetSettings.isGhostMode ||
      targetSettings.visibility === LocationVisibility.NOBODY
    ) {
      return false;
    }

    // Check bidirectional blocks
    const { isBlocked } = await this.socialPolicy.isBlockedEitherDirection(
      viewerId,
      targetUserId,
    );
    if (isBlocked) {
      return false;
    }

    // Close Friends check
    if (targetSettings.visibility === LocationVisibility.CLOSE_FRIENDS) {
      return await this.socialPolicy.isCloseFriend(targetUserId, viewerId);
    }

    // Friends check: viewer must follow target (or be mutual)
    if (targetSettings.visibility === LocationVisibility.FRIENDS) {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: targetUserId,
          },
        },
      });
      return !!follow;
    }

    return false;
  }

  /**
   * Get all user IDs authorized to receive real-time location broadcasts for target user.
   */
  async getAuthorizedAudienceUserIds(
    targetUserId: string,
    visibility: LocationVisibility,
  ): Promise<string[]> {
    if (visibility === LocationVisibility.NOBODY) {
      return [];
    }

    // Get all blocks involving target user to exclude them strictly
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: targetUserId }, { blockedId: targetUserId }],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    const blockedUserIds = new Set<string>();
    blocks.forEach((b) => {
      if (b.blockerId === targetUserId) blockedUserIds.add(b.blockedId);
      if (b.blockedId === targetUserId) blockedUserIds.add(b.blockerId);
    });

    if (visibility === LocationVisibility.CLOSE_FRIENDS) {
      const closeFriends = await this.prisma.closeFriend.findMany({
        where: { userId: targetUserId },
        select: { friendId: true },
      });
      return closeFriends
        .map((cf) => cf.friendId)
        .filter((fid) => !blockedUserIds.has(fid));
    }

    if (visibility === LocationVisibility.FRIENDS) {
      const followers = await this.prisma.follow.findMany({
        where: { followingId: targetUserId },
        select: { followerId: true },
      });
      return followers
        .map((f) => f.followerId)
        .filter((fid) => !blockedUserIds.has(fid));
    }

    return [];
  }
}
