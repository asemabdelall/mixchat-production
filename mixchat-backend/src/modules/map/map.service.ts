import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { LocationVisibilityPolicy } from './location-visibility.policy';
import { PresenceService } from '../chat/realtime/presence.service';
import { ChatGateway } from '../chat/realtime/chat.gateway';
import { RealtimeEvents } from '../chat/realtime/realtime-events';
import { LocationVisibility, StoryStatus } from '@prisma/client';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateLocationSettingsDto } from './dto/update-location-settings.dto';
import {
  LocationSettingsResponseDto,
  MapFriendDto,
  MapFriendsResponseDto,
  LocationUpdateResponseDto,
  LocationDeleteResponseDto,
} from './dto/location-response.dto';

export interface StoredLocationPayload {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number | null;
  speed?: number | null;
  updatedAt: string;
}

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);
  public static readonly LOCATION_REDIS_PREFIX = 'mixchat:location:user';
  public static readonly LOCATION_TTL_SECONDS = 600; // 10 minutes TTL

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly visibilityPolicy: LocationVisibilityPolicy,
    private readonly presenceService: PresenceService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway?: ChatGateway,
  ) {}

  /**
   * Get location privacy settings for authenticated user.
   */
  async getSettings(userId: string): Promise<LocationSettingsResponseDto> {
    let settings = await this.prisma.userLocationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.userLocationSettings.create({
        data: {
          userId,
          isGhostMode: true,
          visibility: LocationVisibility.FRIENDS,
        },
      });
    }

    return {
      isGhostMode: settings.isGhostMode,
      visibility: settings.visibility,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  /**
   * Update location privacy settings (Ghost Mode, audience visibility).
   */
  async updateSettings(
    userId: string,
    dto: UpdateLocationSettingsDto,
  ): Promise<LocationSettingsResponseDto> {
    const existing = await this.getSettings(userId);
    const updated = await this.prisma.userLocationSettings.upsert({
      where: { userId },
      create: {
        userId,
        isGhostMode: dto.isGhostMode ?? true,
        visibility: dto.visibility ?? LocationVisibility.FRIENDS,
      },
      update: {
        ...(dto.isGhostMode !== undefined && { isGhostMode: dto.isGhostMode }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
      },
    });

    // If transitioning to Ghost Mode or NOBODY, immediately delete live coordinates from Redis
    if (
      updated.isGhostMode ||
      updated.visibility === LocationVisibility.NOBODY
    ) {
      await this.deleteLocationFromRedis(userId, existing.visibility);
    }

    return {
      isGhostMode: updated.isGhostMode,
      visibility: updated.visibility,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Accept an ephemeral location update from client and persist with atomic TTL in Redis.
   */
  async updateLocation(
    userId: string,
    dto: UpdateLocationDto,
  ): Promise<LocationUpdateResponseDto> {
    const settings = await this.getSettings(userId);

    // If Ghost Mode is active or visibility is NOBODY, drop coordinate update and ensure Redis is clean
    if (
      settings.isGhostMode ||
      settings.visibility === LocationVisibility.NOBODY
    ) {
      await this.deleteLocationFromRedis(userId, settings.visibility);
      return {
        success: false,
        isGhostMode: true,
        updatedAt: new Date().toISOString(),
      };
    }

    const locationPayload: StoredLocationPayload = {
      userId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy ?? 15,
      heading: dto.heading ?? null,
      speed: dto.speed ?? null,
      updatedAt: new Date().toISOString(),
    };

    const redisKey = `${MapService.LOCATION_REDIS_PREFIX}:${userId}`;

    try {
      const client = this.redisService.getClient();
      // Atomic SET with EX (TTL)
      await client.set(
        redisKey,
        JSON.stringify(locationPayload),
        'EX',
        MapService.LOCATION_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to store location in Redis for user ${userId}: ${(err as Error).message}`,
      );
      return {
        success: false,
        isGhostMode: false,
        updatedAt: locationPayload.updatedAt,
      };
    }

    // Broadcast safe real-time event to authorized viewers
    this.broadcastLocationUpdate(
      userId,
      locationPayload,
      settings.visibility,
    ).catch((err) => {
      this.logger.warn(
        `Failed to broadcast location update for user ${userId}: ${err.message}`,
      );
    });

    return {
      success: true,
      isGhostMode: false,
      updatedAt: locationPayload.updatedAt,
    };
  }

  /**
   * Delete ephemeral location immediately (e.g. Stop Sharing or explicit removal).
   */
  async deleteLocation(userId: string): Promise<LocationDeleteResponseDto> {
    const settings = await this.getSettings(userId);
    await this.deleteLocationFromRedis(userId, settings.visibility);

    return {
      success: true,
      message: 'Location removed successfully',
    };
  }

  /**
   * Fetch live friend locations authorized for the viewer.
   */
  async getFriendsLocations(viewerId: string): Promise<MapFriendsResponseDto> {
    // 1. Fetch followed users with location settings
    const follows = await this.prisma.follow.findMany({
      where: { followerId: viewerId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            isPremium: true,
            status: true,
            locationSettings: true,
          },
        },
      },
    });

    if (follows.length === 0) {
      return { friends: [] };
    }

    // 2. Fetch bidirectional blocks for viewer
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
      },
      select: { blockerId: true, blockedId: true },
    });

    const blockedUserIds = new Set<string>();
    blocks.forEach((b) => {
      if (b.blockerId === viewerId) blockedUserIds.add(b.blockedId);
      if (b.blockedId === viewerId) blockedUserIds.add(b.blockerId);
    });

    // 3. Filter eligible candidate users according to LocationVisibilityPolicy
    const candidateUsers = follows
      .map((f) => f.following)
      .filter((u) => u.status === 'ACTIVE' && !blockedUserIds.has(u.id));

    const eligibleUsers: typeof candidateUsers = [];

    for (const target of candidateUsers) {
      const settings = target.locationSettings || {
        isGhostMode: true,
        visibility: LocationVisibility.FRIENDS,
      };

      if (
        settings.isGhostMode ||
        settings.visibility === LocationVisibility.NOBODY
      ) {
        continue;
      }

      const isAllowed = await this.visibilityPolicy.canViewerSeeTargetLocation(
        viewerId,
        target.id,
        settings,
      );

      if (isAllowed) {
        eligibleUsers.push(target);
      }
    }

    if (eligibleUsers.length === 0) {
      return { friends: [] };
    }

    // 4. Batch query Redis for live coordinates
    const eligibleUserIds = eligibleUsers.map((u) => u.id);
    const client = this.redisService.getClient();
    const pipeline = client.pipeline();

    eligibleUserIds.forEach((uid) => {
      pipeline.get(`${MapService.LOCATION_REDIS_PREFIX}:${uid}`);
    });

    const rawLocations = await pipeline.exec();
    const activeLocationsMap = new Map<string, StoredLocationPayload>();

    eligibleUserIds.forEach((uid, index) => {
      const res = rawLocations ? rawLocations[index] : null;
      if (res && res[1]) {
        try {
          const parsed = JSON.parse(res[1] as string) as StoredLocationPayload;
          if (
            typeof parsed.latitude === 'number' &&
            typeof parsed.longitude === 'number' &&
            !isNaN(parsed.latitude) &&
            !isNaN(parsed.longitude)
          ) {
            activeLocationsMap.set(uid, parsed);
          }
        } catch {
          // Ignore corrupted JSON
        }
      }
    });

    if (activeLocationsMap.size === 0) {
      return { friends: [] };
    }

    const activeUserIds = Array.from(activeLocationsMap.keys());

    // 5. Batch enrich with active Stories and Presence
    const [activeStories, presenceMap] = await Promise.all([
      this.prisma.story.findMany({
        where: {
          authorId: { in: activeUserIds },
          status: StoryStatus.ACTIVE,
          expiresAt: { gt: new Date() },
        },
        include: {
          mediaObject: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.presenceService.getPresence(activeUserIds),
    ]);

    const storyMap = new Map<string, string | null>();
    activeStories.forEach((s) => {
      if (!storyMap.has(s.authorId)) {
        storyMap.set(s.authorId, s.mediaObject?.objectKey || null);
      }
    });

    // 6. Build final DTO list
    const friends: MapFriendDto[] = [];

    for (const user of eligibleUsers) {
      const location = activeLocationsMap.get(user.id);
      if (!location) continue;

      const hasStory = storyMap.has(user.id);
      const storyMediaUrl = storyMap.get(user.id) || null;
      const isOnline = presenceMap[user.id]?.status === 'ONLINE';

      friends.push({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatarUrl: user.avatarUrl,
          isVerified: user.isVerified,
          isPremium: user.isPremium,
        },
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          updatedAt: location.updatedAt,
        },
        hasActiveStory: hasStory,
        storyMediaUrl,
        isOnline,
      });
    }

    return { friends };
  }

  /**
   * Helper: deletes live location from Redis and notifies viewers.
   */
  private async deleteLocationFromRedis(
    userId: string,
    visibility: LocationVisibility,
  ): Promise<void> {
    try {
      const client = this.redisService.getClient();
      await client.del(`${MapService.LOCATION_REDIS_PREFIX}:${userId}`);
    } catch (err) {
      this.logger.warn(
        `Failed to delete Redis location for user ${userId}: ${(err as Error).message}`,
      );
    }

    // Broadcast removal event to authorized viewers
    this.broadcastLocationRemoval(userId, visibility).catch((err) => {
      this.logger.warn(
        `Failed to broadcast location removal for user ${userId}: ${err.message}`,
      );
    });
  }

  /**
   * Broadcast location update over Socket.IO to authorized viewers.
   */
  private async broadcastLocationUpdate(
    userId: string,
    payload: StoredLocationPayload,
    visibility: LocationVisibility,
  ): Promise<void> {
    if (!this.chatGateway?.server) return;

    const audienceIds =
      await this.visibilityPolicy.getAuthorizedAudienceUserIds(
        userId,
        visibility,
      );

    if (audienceIds.length === 0) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
        isPremium: true,
      },
    });

    if (!user) return;

    const dto: MapFriendDto = {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
      },
      location: {
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        updatedAt: payload.updatedAt,
      },
    };

    // Emit to each authorized viewer's private socket room
    for (const viewerId of audienceIds) {
      this.chatGateway.server
        .to(`user:${viewerId}`)
        .emit(RealtimeEvents.MAP_LOCATION_UPDATED, dto);
    }
  }

  /**
   * Broadcast location removal over Socket.IO to authorized viewers.
   */
  private async broadcastLocationRemoval(
    userId: string,
    visibility: LocationVisibility,
  ): Promise<void> {
    if (!this.chatGateway?.server) return;

    const audienceIds =
      await this.visibilityPolicy.getAuthorizedAudienceUserIds(
        userId,
        visibility,
      );

    if (audienceIds.length === 0) return;

    for (const viewerId of audienceIds) {
      this.chatGateway.server
        .to(`user:${viewerId}`)
        .emit(RealtimeEvents.MAP_LOCATION_REMOVED, { userId });
    }
  }
}
