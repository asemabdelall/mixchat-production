import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SocialPolicyService } from '../social/social-policy.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { PublicProfileDto, PrivacySettingsDto } from './dto/user-profile.dto';
import { UserDto } from '../auth/dto/auth-response.dto';
import { SocialUserItemDto } from '../social/dto/social-user.dto';
import { User, Prisma, RelationshipState } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: SocialPolicyService,
  ) {}

  private mapUserToDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName || user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      website: user.website,
      locationCity: user.locationCity,
      isPrivate: user.isPrivate,
      isVerified: user.isVerified,
      isPremium: user.isPremium,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Get authenticated user's own profile
   */
  async getOwnProfile(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status === 'DISABLED') {
      throw new NotFoundException('User profile not found');
    }

    return this.mapUserToDto(user);
  }

  /**
   * Update own profile data (username, displayName, bio, avatar, cover, etc.)
   */
  async updateOwnProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserDto> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser || currentUser.status === 'DISABLED') {
      throw new NotFoundException('User profile not found');
    }

    const dataToUpdate: Prisma.UserUpdateInput = {};

    if (dto.username !== undefined) {
      const normalizedUsername = dto.username.trim().toLowerCase();
      if (normalizedUsername !== currentUser.username) {
        const existing = await this.prisma.user.findUnique({
          where: { username: normalizedUsername },
        });
        if (existing && existing.id !== userId) {
          throw new ConflictException('This username is already taken');
        }
        dataToUpdate.username = normalizedUsername;
      }
    }

    if (dto.displayName !== undefined) {
      dataToUpdate.displayName = dto.displayName.trim();
    }
    if (dto.bio !== undefined) {
      dataToUpdate.bio = dto.bio ? dto.bio.trim() : null;
    }
    if (dto.avatarUrl !== undefined) {
      dataToUpdate.avatarUrl = dto.avatarUrl || null;
    }
    if (dto.coverUrl !== undefined) {
      dataToUpdate.coverUrl = dto.coverUrl || null;
    }
    if (dto.website !== undefined) {
      dataToUpdate.website = dto.website ? dto.website.trim() : null;
    }
    if (dto.locationCity !== undefined) {
      dataToUpdate.locationCity = dto.locationCity
        ? dto.locationCity.trim()
        : null;
    }

    // Handle Private -> Public transition (automatically convert pending requests to follows)
    if (
      dto.isPrivate !== undefined &&
      dto.isPrivate !== currentUser.isPrivate
    ) {
      dataToUpdate.isPrivate = dto.isPrivate;

      if (!dto.isPrivate && currentUser.isPrivate) {
        // Transitioning from Private -> Public
        await this.prisma.$transaction(async (tx) => {
          const pendingRequests = await tx.followRequest.findMany({
            where: { targetId: userId },
          });

          for (const req of pendingRequests) {
            const existingFollow = await tx.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: req.requesterId,
                  followingId: userId,
                },
              },
            });

            if (!existingFollow) {
              await tx.follow.create({
                data: {
                  followerId: req.requesterId,
                  followingId: userId,
                },
              });
              await tx.user.update({
                where: { id: req.requesterId },
                data: { followingCount: { increment: 1 } },
              });
              await tx.user.update({
                where: { id: userId },
                data: { followersCount: { increment: 1 } },
              });
            }
          }

          await tx.followRequest.deleteMany({
            where: { targetId: userId },
          });
        });
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    return this.mapUserToDto(updatedUser);
  }

  /**
   * Get public profile for another user or username
   */
  async getPublicProfile(
    viewerId: string,
    usernameOrId: string,
  ): Promise<PublicProfileDto> {
    const target = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrId.toLowerCase() }, { id: usernameOrId }],
      },
    });

    if (!target || target.status === 'DISABLED') {
      throw new NotFoundException('User profile not found');
    }

    const { blockedByB } = await this.policyService.isBlockedEitherDirection(
      viewerId,
      target.id,
    );

    // If viewer is blocked by target, return 404 to avoid privacy leakage
    if (blockedByB) {
      throw new NotFoundException('User profile not found');
    }

    const [relationshipState, isCloseFriend] = await Promise.all([
      this.policyService.getRelationshipState(viewerId, target.id),
      this.policyService.isCloseFriend(target.id, viewerId),
    ]);

    return {
      id: target.id,
      username: target.username,
      displayName: target.displayName || target.username,
      bio: target.bio,
      avatarUrl: target.avatarUrl,
      coverUrl: target.coverUrl,
      website: target.website,
      locationCity: target.locationCity,
      isPrivate: target.isPrivate,
      isVerified: target.isVerified,
      isPremium: target.isPremium,
      followersCount: target.followersCount,
      followingCount: target.followingCount,
      relationshipState,
      isCloseFriend,
      createdAt: target.createdAt.toISOString(),
    };
  }

  /**
   * Basic user search/discovery respecting blocks
   */
  async searchUsers(
    viewerId: string,
    query: string,
    limit = 20,
  ): Promise<SocialUserItemDto[]> {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const safeLimit = Math.min(Math.max(limit, 1), 50);

    // Find blocked IDs in either direction
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
      },
    });

    const excludedIds = new Set<string>([viewerId]);
    blocks.forEach((b) => {
      excludedIds.add(b.blockerId);
      excludedIds.add(b.blockedId);
    });

    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: Array.from(excludedIds) },
        status: 'ACTIVE',
        OR: [
          { username: { contains: cleanQuery, mode: 'insensitive' } },
          { displayName: { contains: cleanQuery, mode: 'insensitive' } },
        ],
      },
      take: safeLimit,
      orderBy: { followersCount: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isPrivate: true,
        isVerified: true,
      },
    });

    const relationshipSnapshots =
      await this.policyService.getRelationshipSnapshots(
        viewerId,
        users.map((user) => user.id),
      );

    const items: SocialUserItemDto[] = users.map((u) => {
      const snapshot = relationshipSnapshots.get(u.id);
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName || u.username,
        bio: u.bio,
        avatarUrl: u.avatarUrl,
        isPrivate: u.isPrivate,
        isVerified: u.isVerified,
        relationshipState:
          snapshot?.relationshipState ?? RelationshipState.NONE,
        isCloseFriend: snapshot?.isCloseFriend ?? false,
      };
    });

    return items;
  }

  /**
   * Get user privacy settings
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettingsDto> {
    let settings = await this.prisma.privacySettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.privacySettings.create({
        data: { userId },
      });
    }

    return {
      lastSeen: settings.lastSeen,
      profilePhoto: settings.profilePhoto,
      locationMode: settings.locationMode,
      readReceipts: settings.readReceipts,
      allowMentions: settings.allowMentions,
      allowDirectMessages: settings.allowDirectMessages,
    };
  }

  /**
   * Update user privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    dto: UpdatePrivacyDto,
  ): Promise<PrivacySettingsDto> {
    const updated = await this.prisma.privacySettings.upsert({
      where: { userId },
      create: {
        userId,
        lastSeen: dto.lastSeen ?? 'Everyone',
        profilePhoto: dto.profilePhoto ?? 'Everyone',
        locationMode: dto.locationMode ?? 'exact',
        readReceipts: dto.readReceipts ?? true,
        allowMentions: dto.allowMentions ?? 'Everyone',
        allowDirectMessages: dto.allowDirectMessages ?? 'Everyone',
      },
      update: {
        ...(dto.lastSeen !== undefined ? { lastSeen: dto.lastSeen } : {}),
        ...(dto.profilePhoto !== undefined
          ? { profilePhoto: dto.profilePhoto }
          : {}),
        ...(dto.locationMode !== undefined
          ? { locationMode: dto.locationMode }
          : {}),
        ...(dto.readReceipts !== undefined
          ? { readReceipts: dto.readReceipts }
          : {}),
        ...(dto.allowMentions !== undefined
          ? { allowMentions: dto.allowMentions }
          : {}),
        ...(dto.allowDirectMessages !== undefined
          ? { allowDirectMessages: dto.allowDirectMessages }
          : {}),
      },
    });

    return {
      lastSeen: updated.lastSeen,
      profilePhoto: updated.profilePhoto,
      locationMode: updated.locationMode,
      readReceipts: updated.readReceipts,
      allowMentions: updated.allowMentions,
      allowDirectMessages: updated.allowDirectMessages,
    };
  }
}
