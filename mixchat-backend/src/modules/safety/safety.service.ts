import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import {
  PaginatedBlockedUsersDto,
  PaginatedMutedUsersDto,
  BlockedUserItemDto,
  MutedUserItemDto,
} from './dto/blocked-muted-users.dto';

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Block a user with full social graph cascade cleanup.
   */
  async blockUser(
    blockerId: string,
    targetUserId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (blockerId === targetUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Create block row (idempotent)
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

      // 2. Remove follow A -> B if exists
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

      // 3. Remove follow B -> A if exists
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

      // 4. Remove all pending follow requests in both directions
      await tx.followRequest.deleteMany({
        where: {
          OR: [
            { requesterId: blockerId, targetId: targetUserId },
            { requesterId: targetUserId, targetId: blockerId },
          ],
        },
      });

      // 5. Remove all Close Friends memberships in both directions
      await tx.closeFriend.deleteMany({
        where: {
          OR: [
            { userId: blockerId, friendId: targetUserId },
            { userId: targetUserId, friendId: blockerId },
          ],
        },
      });
    });

    // 6. Invalidate Snap Map location cache
    try {
      await Promise.all([
        this.redis.del(`mixchat:location:user:${blockerId}`),
        this.redis.del(`mixchat:location:user:${targetUserId}`),
      ]);
    } catch {
      // Non-blocking Redis cache cleanup
    }

    this.logger.log(`User ${blockerId} blocked user ${targetUserId}`);

    return { success: true, message: 'User blocked successfully' };
  }

  /**
   * Unblock a user.
   * Note: Unblocking does NOT automatically restore previous follow or Close Friends relations.
   */
  async unblockUser(
    blockerId: string,
    targetUserId: string,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: targetUserId,
        },
      },
    });

    if (existing) {
      await this.prisma.block.delete({
        where: { id: existing.id },
      });
    }

    this.logger.log(`User ${blockerId} unblocked user ${targetUserId}`);

    return { success: true, message: 'User unblocked successfully' };
  }

  /**
   * Get paginated list of accounts blocked by the current user.
   */
  async getBlockedUsers(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedBlockedUsersDto> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const [blocks, totalCount] = await Promise.all([
      this.prisma.block.findMany({
        where: { blockerId: userId },
        include: {
          blocked: {
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.block.count({ where: { blockerId: userId } }),
    ]);

    const hasMore = blocks.length > safeLimit;
    const itemsToReturn = hasMore ? blocks.slice(0, safeLimit) : blocks;
    const nextCursor = hasMore
      ? itemsToReturn[itemsToReturn.length - 1].id
      : null;

    const items: BlockedUserItemDto[] = itemsToReturn.map((b) => ({
      id: b.blocked.id,
      username: b.blocked.username,
      displayName: b.blocked.displayName || b.blocked.username,
      avatarUrl: b.blocked.avatarUrl,
      blockedAt: b.createdAt.toISOString(),
    }));

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * Mute an account (suppresses creator's content from personalized feeds).
   */
  async muteUser(
    muterId: string,
    targetUserId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (muterId === targetUserId) {
      throw new BadRequestException('Cannot mute yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.mute.findUnique({
      where: {
        muterId_mutedId: {
          muterId,
          mutedId: targetUserId,
        },
      },
    });

    if (!existing) {
      await this.prisma.mute.create({
        data: {
          muterId,
          mutedId: targetUserId,
        },
      });
    }

    this.logger.log(`User ${muterId} muted user ${targetUserId}`);

    return { success: true, message: 'User muted successfully' };
  }

  /**
   * Unmute an account.
   */
  async unmuteUser(
    muterId: string,
    targetUserId: string,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.mute.findUnique({
      where: {
        muterId_mutedId: {
          muterId,
          mutedId: targetUserId,
        },
      },
    });

    if (existing) {
      await this.prisma.mute.delete({
        where: { id: existing.id },
      });
    }

    this.logger.log(`User ${muterId} unmuted user ${targetUserId}`);

    return { success: true, message: 'User unmuted successfully' };
  }

  /**
   * Get paginated list of accounts muted by current user.
   */
  async getMutedUsers(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedMutedUsersDto> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const [mutes, totalCount] = await Promise.all([
      this.prisma.mute.findMany({
        where: { muterId: userId },
        include: {
          muted: {
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mute.count({ where: { muterId: userId } }),
    ]);

    const hasMore = mutes.length > safeLimit;
    const itemsToReturn = hasMore ? mutes.slice(0, safeLimit) : mutes;
    const nextCursor = hasMore
      ? itemsToReturn[itemsToReturn.length - 1].id
      : null;

    const items: MutedUserItemDto[] = itemsToReturn.map((m) => ({
      id: m.muted.id,
      username: m.muted.username,
      displayName: m.muted.displayName || m.muted.username,
      avatarUrl: m.muted.avatarUrl,
      mutedAt: m.createdAt.toISOString(),
    }));

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * Get set of muted user IDs for feed exclusions.
   */
  async getMutedUserIds(userId: string): Promise<string[]> {
    const mutes = await this.prisma.mute.findMany({
      where: { muterId: userId },
      select: { mutedId: true },
    });
    return mutes.map((m) => m.mutedId);
  }
}
