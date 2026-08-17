import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SocialPolicyService } from './social-policy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, RelationshipState } from '@prisma/client';
import {
  PaginatedSocialUsersDto,
  SocialUserItemDto,
} from './dto/social-user.dto';
import {
  FollowRequestItemDto,
  PaginatedFollowRequestsDto,
} from './dto/follow-request.dto';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: SocialPolicyService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Follow a user or create follow request if private
   */
  async followUser(
    followerId: string,
    targetId: string,
  ): Promise<{ relationshipState: RelationshipState; message: string }> {
    if (followerId === targetId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    await this.policyService.assertCanInteract(followerId, targetId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!targetUser || targetUser.status === 'DISABLED') {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetId,
        },
      },
    });

    if (existingFollow) {
      const state = await this.policyService.getRelationshipState(
        followerId,
        targetId,
      );
      return {
        relationshipState: state,
        message: 'Already following this user',
      };
    }

    // If target account is private, create or return follow request
    if (targetUser.isPrivate) {
      const existingRequest = await this.prisma.followRequest.findUnique({
        where: {
          requesterId_targetId: {
            requesterId: followerId,
            targetId,
          },
        },
      });

      if (existingRequest) {
        return {
          relationshipState: RelationshipState.REQUESTED,
          message: 'Follow request is already pending',
        };
      }

      await this.prisma.followRequest.create({
        data: {
          requesterId: followerId,
          targetId,
        },
      });

      await this.notificationsService.createNotification({
        recipientId: targetId,
        actorId: followerId,
        type: NotificationType.FOLLOW_REQUEST,
        entityId: followerId,
        entityType: 'USER',
      });

      return {
        relationshipState: RelationshipState.REQUESTED,
        message: 'Follow request sent successfully',
      };
    }

    // Public account -> Immediate follow with atomic counter increments
    await this.prisma.$transaction(async (tx) => {
      await tx.follow.create({
        data: {
          followerId,
          followingId: targetId,
        },
      });

      // Remove any lingering follow requests
      await tx.followRequest.deleteMany({
        where: {
          requesterId: followerId,
          targetId,
        },
      });

      await tx.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      });

      await tx.user.update({
        where: { id: targetId },
        data: { followersCount: { increment: 1 } },
      });
    });

    await this.notificationsService.createNotification({
      recipientId: targetId,
      actorId: followerId,
      type: NotificationType.FOLLOW,
      entityId: followerId,
      entityType: 'USER',
    });

    const state = await this.policyService.getRelationshipState(
      followerId,
      targetId,
    );

    return {
      relationshipState: state,
      message: 'Followed successfully',
    };
  }

  /**
   * Unfollow a user or cancel pending follow request
   */
  async unfollowUser(
    followerId: string,
    targetId: string,
  ): Promise<{ relationshipState: RelationshipState; message: string }> {
    if (followerId === targetId) {
      throw new BadRequestException('Cannot unfollow yourself');
    }

    // Cancel pending follow request if exists
    const request = await this.prisma.followRequest.findUnique({
      where: {
        requesterId_targetId: {
          requesterId: followerId,
          targetId,
        },
      },
    });

    if (request) {
      await this.prisma.followRequest.delete({
        where: { id: request.id },
      });

      const state = await this.policyService.getRelationshipState(
        followerId,
        targetId,
      );
      return {
        relationshipState: state,
        message: 'Follow request cancelled',
      };
    }

    // Remove active follow relationship
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetId,
        },
      },
    });

    if (follow) {
      await this.prisma.$transaction(async (tx) => {
        await tx.follow.delete({
          where: { id: follow.id },
        });

        await tx.user.update({
          where: { id: followerId },
          data: {
            followingCount: {
              decrement: 1,
            },
          },
        });

        await tx.user.update({
          where: { id: targetId },
          data: {
            followersCount: {
              decrement: 1,
            },
          },
        });

        // If target had follower in close friends, remove
        await tx.closeFriend.deleteMany({
          where: {
            userId: targetId,
            friendId: followerId,
          },
        });
      });
    }

    const state = await this.policyService.getRelationshipState(
      followerId,
      targetId,
    );

    return {
      relationshipState: state,
      message: 'Unfollowed successfully',
    };
  }

  /**
   * Remove a follower from user's own profile
   */
  async removeFollower(
    ownerId: string,
    followerId: string,
  ): Promise<{ message: string }> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: ownerId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follower relationship not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.follow.delete({
        where: { id: follow.id },
      });

      await tx.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      });

      await tx.user.update({
        where: { id: ownerId },
        data: { followersCount: { decrement: 1 } },
      });

      await tx.closeFriend.deleteMany({
        where: {
          userId: ownerId,
          friendId: followerId,
        },
      });
    });

    return { message: 'Follower removed successfully' };
  }

  /**
   * List followers for a user with cursor pagination
   */
  async getFollowers(
    viewerId: string,
    targetUserId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedSocialUsersDto> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || targetUser.status === 'DISABLED') {
      throw new NotFoundException('User not found');
    }

    const { isBlocked } = await this.policyService.isBlockedEitherDirection(
      viewerId,
      targetUserId,
    );
    if (isBlocked) {
      throw new ForbiddenException('Cannot view followers for this user');
    }

    if (targetUser.isPrivate && viewerId !== targetUserId) {
      const isViewerFollowing = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: targetUserId,
          },
        },
      });
      if (!isViewerFollowing) {
        throw new ForbiddenException('This account is private');
      }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const follows = await this.prisma.follow.findMany({
      where: { followingId: targetUserId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            isPrivate: true,
            isVerified: true,
          },
        },
      },
      take: safeLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const hasMore = follows.length > safeLimit;
    const itemsToReturn = hasMore ? follows.slice(0, safeLimit) : follows;
    const nextCursor = hasMore
      ? itemsToReturn[itemsToReturn.length - 1].id
      : null;

    const relationshipSnapshots =
      await this.policyService.getRelationshipSnapshots(
        viewerId,
        itemsToReturn.map((follow) => follow.follower.id),
      );
    const items: SocialUserItemDto[] = itemsToReturn.map((f) => {
      const snapshot = relationshipSnapshots.get(f.follower.id);
      return {
        id: f.follower.id,
        username: f.follower.username,
        displayName: f.follower.displayName || f.follower.username,
        bio: f.follower.bio,
        avatarUrl: f.follower.avatarUrl,
        isPrivate: f.follower.isPrivate,
        isVerified: f.follower.isVerified,
        relationshipState:
          snapshot?.relationshipState ?? RelationshipState.NONE,
        isCloseFriend: snapshot?.isCloseFriend ?? false,
      };
    });

    return {
      items,
      nextCursor,
      hasMore,
      totalCount: targetUser.followersCount,
    };
  }

  /**
   * List following for a user with cursor pagination
   */
  async getFollowing(
    viewerId: string,
    targetUserId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedSocialUsersDto> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || targetUser.status === 'DISABLED') {
      throw new NotFoundException('User not found');
    }

    const { isBlocked } = await this.policyService.isBlockedEitherDirection(
      viewerId,
      targetUserId,
    );
    if (isBlocked) {
      throw new ForbiddenException('Cannot view following for this user');
    }

    if (targetUser.isPrivate && viewerId !== targetUserId) {
      const isViewerFollowing = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: targetUserId,
          },
        },
      });
      if (!isViewerFollowing) {
        throw new ForbiddenException('This account is private');
      }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const follows = await this.prisma.follow.findMany({
      where: { followerId: targetUserId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            isPrivate: true,
            isVerified: true,
          },
        },
      },
      take: safeLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const hasMore = follows.length > safeLimit;
    const itemsToReturn = hasMore ? follows.slice(0, safeLimit) : follows;
    const nextCursor = hasMore
      ? itemsToReturn[itemsToReturn.length - 1].id
      : null;

    const relationshipSnapshots =
      await this.policyService.getRelationshipSnapshots(
        viewerId,
        itemsToReturn.map((follow) => follow.following.id),
      );
    const items: SocialUserItemDto[] = itemsToReturn.map((f) => {
      const snapshot = relationshipSnapshots.get(f.following.id);
      return {
        id: f.following.id,
        username: f.following.username,
        displayName: f.following.displayName || f.following.username,
        bio: f.following.bio,
        avatarUrl: f.following.avatarUrl,
        isPrivate: f.following.isPrivate,
        isVerified: f.following.isVerified,
        relationshipState:
          snapshot?.relationshipState ?? RelationshipState.NONE,
        isCloseFriend: snapshot?.isCloseFriend ?? false,
      };
    });

    return {
      items,
      nextCursor,
      hasMore,
      totalCount: targetUser.followingCount,
    };
  }

  /**
   * List incoming follow requests for authenticated user
   */
  async getFollowRequests(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedFollowRequestsDto> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const requests = await this.prisma.followRequest.findMany({
      where: { targetId: userId },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      take: safeLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const totalCount = await this.prisma.followRequest.count({
      where: { targetId: userId },
    });

    const hasMore = requests.length > safeLimit;
    const itemsToReturn = hasMore ? requests.slice(0, safeLimit) : requests;
    const nextCursor = hasMore
      ? itemsToReturn[itemsToReturn.length - 1].id
      : null;

    const items: FollowRequestItemDto[] = itemsToReturn.map((r) => ({
      id: r.id,
      requesterId: r.requester.id,
      username: r.requester.username,
      displayName: r.requester.displayName || r.requester.username,
      avatarUrl: r.requester.avatarUrl,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * Accept incoming follow request
   */
  async acceptFollowRequest(
    targetUserId: string,
    requestId: string,
  ): Promise<{ message: string; follower: { id: string; username: string } }> {
    const request = await this.prisma.followRequest.findUnique({
      where: { id: requestId },
      include: { requester: true },
    });

    if (!request || request.targetId !== targetUserId) {
      throw new NotFoundException('Follow request not found');
    }

    const requesterId = request.requesterId;

    await this.prisma.$transaction(async (tx) => {
      await tx.followRequest.delete({
        where: { id: requestId },
      });

      // Avoid race if follow was already created
      const existing = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: requesterId,
            followingId: targetUserId,
          },
        },
      });

      if (!existing) {
        await tx.follow.create({
          data: {
            followerId: requesterId,
            followingId: targetUserId,
          },
        });

        await tx.user.update({
          where: { id: requesterId },
          data: {
            followingCount: {
              increment: 1,
            },
          },
        });

        await tx.user.update({
          where: { id: targetUserId },
          data: { followersCount: { increment: 1 } },
        });
      }
    });

    await this.notificationsService.createNotification({
      recipientId: requesterId,
      actorId: targetUserId,
      type: NotificationType.FOLLOW_ACCEPT,
      entityId: targetUserId,
      entityType: 'USER',
    });

    return {
      message: 'Follow request accepted',
      follower: {
        id: request.requester.id,
        username: request.requester.username,
      },
    };
  }

  /**
   * Decline incoming follow request
   */
  async declineFollowRequest(
    targetUserId: string,
    requestId: string,
  ): Promise<{ message: string }> {
    const request = await this.prisma.followRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.targetId !== targetUserId) {
      throw new NotFoundException('Follow request not found');
    }

    await this.prisma.followRequest.delete({
      where: { id: requestId },
    });

    return { message: 'Follow request declined' };
  }

  /**
   * Block a user atomically
   */
  async blockUser(
    blockerId: string,
    targetUserId: string,
  ): Promise<{ message: string }> {
    if (blockerId === targetUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Create block entry (ignore duplicate error if already blocked)
      const existingBlock = await tx.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId: targetUserId,
          },
        },
      });

      if (!existingBlock) {
        await tx.block.create({
          data: {
            blockerId,
            blockedId: targetUserId,
          },
        });
      }

      // 1. Remove Follow A -> B if exists
      const followAtoB = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: blockerId,
            followingId: targetUserId,
          },
        },
      });
      if (followAtoB) {
        await tx.follow.delete({ where: { id: followAtoB.id } });
        await tx.user.update({
          where: { id: blockerId },
          data: { followingCount: { decrement: 1 } },
        });
        await tx.user.update({
          where: { id: targetUserId },
          data: { followersCount: { decrement: 1 } },
        });
      }

      // 2. Remove Follow B -> A if exists
      const followBtoA = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUserId,
            followingId: blockerId,
          },
        },
      });
      if (followBtoA) {
        await tx.follow.delete({ where: { id: followBtoA.id } });
        await tx.user.update({
          where: { id: targetUserId },
          data: { followingCount: { decrement: 1 } },
        });
        await tx.user.update({
          where: { id: blockerId },
          data: { followersCount: { decrement: 1 } },
        });
      }

      // 3. Remove all pending follow requests between them
      await tx.followRequest.deleteMany({
        where: {
          OR: [
            { requesterId: blockerId, targetId: targetUserId },
            { requesterId: targetUserId, targetId: blockerId },
          ],
        },
      });

      // 4. Remove all Close Friends memberships between them
      await tx.closeFriend.deleteMany({
        where: {
          OR: [
            { userId: blockerId, friendId: targetUserId },
            { userId: targetUserId, friendId: blockerId },
          ],
        },
      });
    });

    return { message: 'User blocked successfully' };
  }

  /**
   * Unblock a user
   */
  async unblockUser(
    blockerId: string,
    targetUserId: string,
  ): Promise<{ message: string }> {
    const block = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: targetUserId,
        },
      },
    });

    if (block) {
      await this.prisma.block.delete({
        where: { id: block.id },
      });
    }

    return { message: 'User unblocked successfully' };
  }

  /**
   * List blocked users for authenticated user
   */
  async getBlockedUsers(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedSocialUsersDto> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            isPrivate: true,
            isVerified: true,
          },
        },
      },
      take: safeLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const totalCount = await this.prisma.block.count({
      where: { blockerId: userId },
    });

    const hasMore = blocks.length > safeLimit;
    const itemsToReturn = hasMore ? blocks.slice(0, safeLimit) : blocks;
    const nextCursor = hasMore
      ? itemsToReturn[itemsToReturn.length - 1].id
      : null;

    const items: SocialUserItemDto[] = itemsToReturn.map((b) => ({
      id: b.blocked.id,
      username: b.blocked.username,
      displayName: b.blocked.displayName || b.blocked.username,
      bio: b.blocked.bio,
      avatarUrl: b.blocked.avatarUrl,
      isPrivate: b.blocked.isPrivate,
      isVerified: b.blocked.isVerified,
      relationshipState: RelationshipState.BLOCKED,
      isCloseFriend: false,
    }));

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * List close friends for authenticated user
   */
  async getCloseFriends(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedSocialUsersDto> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const closeFriends = await this.prisma.closeFriend.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            isPrivate: true,
            isVerified: true,
          },
        },
      },
      take: safeLimit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const totalCount = await this.prisma.closeFriend.count({
      where: { userId },
    });

    const hasMore = closeFriends.length > safeLimit;
    const itemsToReturn = hasMore
      ? closeFriends.slice(0, safeLimit)
      : closeFriends;
    const nextCursor = hasMore
      ? itemsToReturn[itemsToReturn.length - 1].id
      : null;

    const relationshipSnapshots =
      await this.policyService.getRelationshipSnapshots(
        userId,
        itemsToReturn.map((closeFriend) => closeFriend.friend.id),
      );
    const items: SocialUserItemDto[] = itemsToReturn.map((cf) => {
      const snapshot = relationshipSnapshots.get(cf.friend.id);
      return {
        id: cf.friend.id,
        username: cf.friend.username,
        displayName: cf.friend.displayName || cf.friend.username,
        bio: cf.friend.bio,
        avatarUrl: cf.friend.avatarUrl,
        isPrivate: cf.friend.isPrivate,
        isVerified: cf.friend.isVerified,
        relationshipState:
          snapshot?.relationshipState ?? RelationshipState.NONE,
        isCloseFriend: true,
      };
    });

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * Add a user to Close Friends
   */
  async addCloseFriend(
    userId: string,
    targetUserId: string,
  ): Promise<{ message: string }> {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot add yourself to close friends');
    }

    await this.policyService.assertCanInteract(userId, targetUserId);

    const existing = await this.prisma.closeFriend.findUnique({
      where: {
        userId_friendId: {
          userId,
          friendId: targetUserId,
        },
      },
    });

    if (existing) {
      return { message: 'User is already in close friends' };
    }

    await this.prisma.closeFriend.create({
      data: {
        userId,
        friendId: targetUserId,
      },
    });

    return { message: 'Added to close friends' };
  }

  /**
   * Remove a user from Close Friends
   */
  async removeCloseFriend(
    userId: string,
    targetUserId: string,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.closeFriend.findUnique({
      where: {
        userId_friendId: {
          userId,
          friendId: targetUserId,
        },
      },
    });

    if (existing) {
      await this.prisma.closeFriend.delete({
        where: { id: existing.id },
      });
    }

    return { message: 'Removed from close friends' };
  }
}
