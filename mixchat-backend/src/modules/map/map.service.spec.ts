import { Test, TestingModule } from '@nestjs/testing';
import { MapService } from './map.service';
import { LocationVisibilityPolicy } from './location-visibility.policy';
import { SocialPolicyService } from '../social/social-policy.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { PresenceService } from '../chat/realtime/presence.service';
import { ChatGateway } from '../chat/realtime/chat.gateway';
import { LocationVisibility } from '@prisma/client';

describe('MapService', () => {
  let mapService: MapService;
  let prismaService: any;
  let presenceService: any;
  let mockRedisClient: any;
  let mockSocketServer: any;

  const mockDate = new Date('2026-08-15T12:00:00.000Z');

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    mockSocketServer = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    };

    const mockPrisma = {
      userLocationSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      follow: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      block: {
        findMany: jest.fn(),
      },
      closeFriend: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      story: {
        findMany: jest.fn(),
      },
    };

    const mockRedis = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    const mockPresence = {
      getPresence: jest.fn().mockResolvedValue({}),
    };

    const mockChatGateway = {
      server: mockSocketServer,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        LocationVisibilityPolicy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: PresenceService, useValue: mockPresence },
        {
          provide: SocialPolicyService,
          useValue: {
            isBlockedEitherDirection: jest.fn().mockResolvedValue({
              blockedByA: false,
              blockedByB: false,
              isBlocked: false,
            }),
            isCloseFriend: jest.fn().mockResolvedValue(false),
          },
        },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    }).compile();

    mapService = module.get<MapService>(MapService);
    prismaService = module.get(PrismaService);
    presenceService = module.get(PresenceService);
  });

  describe('getSettings', () => {
    it('should return existing settings for user', async () => {
      prismaService.userLocationSettings.findUnique.mockResolvedValue({
        userId: 'user-1',
        isGhostMode: false,
        visibility: LocationVisibility.FRIENDS,
        updatedAt: mockDate,
      });

      const result = await mapService.getSettings('user-1');
      expect(result).toEqual({
        isGhostMode: false,
        visibility: LocationVisibility.FRIENDS,
        updatedAt: mockDate.toISOString(),
      });
    });

    it('should create default settings with Ghost Mode = true if not found', async () => {
      prismaService.userLocationSettings.findUnique.mockResolvedValue(null);
      prismaService.userLocationSettings.create.mockResolvedValue({
        userId: 'user-2',
        isGhostMode: true,
        visibility: LocationVisibility.FRIENDS,
        updatedAt: mockDate,
      });

      const result = await mapService.getSettings('user-2');
      expect(prismaService.userLocationSettings.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-2',
          isGhostMode: true,
          visibility: LocationVisibility.FRIENDS,
        },
      });
      expect(result.isGhostMode).toBe(true);
    });
  });

  describe('updateSettings & Ghost Mode deletion', () => {
    it('should delete Redis coordinates immediately when enabling Ghost Mode', async () => {
      prismaService.userLocationSettings.findUnique.mockResolvedValue({
        userId: 'user-1',
        isGhostMode: false,
        visibility: LocationVisibility.FRIENDS,
        updatedAt: mockDate,
      });
      prismaService.userLocationSettings.upsert.mockResolvedValue({
        userId: 'user-1',
        isGhostMode: true,
        visibility: LocationVisibility.FRIENDS,
        updatedAt: mockDate,
      });
      prismaService.block.findMany.mockResolvedValue([]);
      prismaService.follow.findMany.mockResolvedValue([
        { followerId: 'viewer-1' },
      ]);

      const result = await mapService.updateSettings('user-1', {
        isGhostMode: true,
      });

      expect(result.isGhostMode).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'mixchat:location:user:user-1',
      );
    });
  });

  describe('updateLocation', () => {
    it('should drop coordinates and not store in Redis if Ghost Mode is active', async () => {
      prismaService.userLocationSettings.findUnique.mockResolvedValue({
        userId: 'user-ghost',
        isGhostMode: true,
        visibility: LocationVisibility.FRIENDS,
        updatedAt: mockDate,
      });
      prismaService.block.findMany.mockResolvedValue([]);

      const result = await mapService.updateLocation('user-ghost', {
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(result.success).toBe(false);
      expect(result.isGhostMode).toBe(true);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'mixchat:location:user:user-ghost',
      );
    });

    it('should atomically store coordinates in Redis with 600s TTL when Ghost Mode is false', async () => {
      prismaService.userLocationSettings.findUnique.mockResolvedValue({
        userId: 'user-active',
        isGhostMode: false,
        visibility: LocationVisibility.FRIENDS,
        updatedAt: mockDate,
      });
      prismaService.block.findMany.mockResolvedValue([]);
      prismaService.follow.findMany.mockResolvedValue([
        { followerId: 'viewer-10' },
      ]);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-active',
        username: 'activeuser',
        displayName: 'Active User',
        avatarUrl: null,
        isVerified: false,
        isPremium: false,
      });

      const result = await mapService.updateLocation('user-active', {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
      });

      expect(result.success).toBe(true);
      expect(result.isGhostMode).toBe(false);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'mixchat:location:user:user-active',
        expect.stringContaining('"latitude":40.7128'),
        'EX',
        600,
      );
    });
  });

  describe('deleteLocation', () => {
    it('should remove coordinates from Redis immediately', async () => {
      prismaService.userLocationSettings.findUnique.mockResolvedValue({
        userId: 'user-del',
        isGhostMode: false,
        visibility: LocationVisibility.FRIENDS,
        updatedAt: mockDate,
      });
      prismaService.block.findMany.mockResolvedValue([]);

      const result = await mapService.deleteLocation('user-del');
      expect(result.success).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        'mixchat:location:user:user-del',
      );
    });
  });

  describe('getFriendsLocations', () => {
    it('should return only non-ghost, non-blocked authorized friends with active Redis locations', async () => {
      const viewerId = 'viewer-1';
      const friend1Id = 'friend-1';
      const friend2Id = 'friend-2';

      prismaService.follow.findMany.mockResolvedValue([
        {
          following: {
            id: friend1Id,
            username: 'friend1',
            displayName: 'Friend One',
            avatarUrl: null,
            isVerified: true,
            isPremium: false,
            status: 'ACTIVE',
            locationSettings: {
              isGhostMode: false,
              visibility: LocationVisibility.FRIENDS,
            },
          },
        },
        {
          following: {
            id: friend2Id,
            username: 'friend2',
            displayName: 'Friend Two',
            avatarUrl: null,
            isVerified: false,
            isPremium: false,
            status: 'ACTIVE',
            locationSettings: {
              isGhostMode: true, // Ghost mode -> excluded
              visibility: LocationVisibility.FRIENDS,
            },
          },
        },
      ]);

      prismaService.block.findMany.mockResolvedValue([]);
      prismaService.follow.findUnique.mockResolvedValue({
        followerId: viewerId,
        followingId: friend1Id,
      });

      const pipelineMock = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [
            null,
            JSON.stringify({
              userId: friend1Id,
              latitude: 37.78,
              longitude: -122.41,
              accuracy: 12,
              updatedAt: mockDate.toISOString(),
            }),
          ],
        ]),
      };
      mockRedisClient.pipeline.mockReturnValue(pipelineMock);

      prismaService.story.findMany.mockResolvedValue([]);
      presenceService.getPresence.mockResolvedValue({
        [friend1Id]: { status: 'ONLINE', lastSeen: null },
      });

      const response = await mapService.getFriendsLocations(viewerId);

      expect(response.friends).toHaveLength(1);
      expect(response.friends[0].user.id).toBe(friend1Id);
      expect(response.friends[0].location.latitude).toBe(37.78);
      expect(response.friends[0].isOnline).toBe(true);
    });
  });
});
