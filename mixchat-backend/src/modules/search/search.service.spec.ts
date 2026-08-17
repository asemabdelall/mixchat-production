import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { MediaService } from '../media/media.service';
import { SocialPolicyService } from '../social/social-policy.service';
import { PostsPolicyService } from '../posts/posts-policy.service';
import { SearchType } from './dto/search-query.dto';

describe('SearchService', () => {
  let service: SearchService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
    },
    block: {
      findMany: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    lrange: jest.fn(),
    lrem: jest.fn(),
    lpush: jest.fn(),
    ltrim: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
  };

  const mockMediaService = {
    toDto: jest.fn().mockImplementation((m) =>
      Promise.resolve({
        ...m,
        publicUrl: `https://cdn.mixchat.app/${m.objectKey || 'media.webp'}`,
      }),
    ),
  };

  const mockSocialPolicy = {
    assertCanFollow: jest.fn(),
  };

  const mockPostsPolicy = {
    assertCanViewPost: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: MediaService, useValue: mockMediaService },
        { provide: SocialPolicyService, useValue: mockSocialPolicy },
        { provide: PostsPolicyService, useValue: mockPostsPolicy },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  describe('universalSearch', () => {
    it('should return empty result when query is empty', async () => {
      const result = await service.universalSearch({
        q: '',
        type: SearchType.ALL,
        limit: 20,
      });
      expect(result.users).toEqual([]);
      expect(result.posts).toEqual([]);
      expect(result.tags).toEqual([]);
      expect(result.media).toEqual([]);
    });

    it('should search users and rank exact match highest', async () => {
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          username: 'alex',
          displayName: 'Alex Top',
          bio: 'Dev',
          avatarUrl: null,
          coverUrl: null,
          website: null,
          locationCity: null,
          isPrivate: false,
          isVerified: true,
          isPremium: false,
          followersCount: 100,
          followingCount: 10,
          postsCount: 5,
          createdAt: new Date(),
          followers: [],
          following: [],
          sentFollowRequests: [],
          receivedFollowRequests: [],
        },
        {
          id: 'u2',
          username: 'alexander_the_great',
          displayName: 'Alexander',
          bio: 'Leader',
          avatarUrl: null,
          coverUrl: null,
          website: null,
          locationCity: null,
          isPrivate: false,
          isVerified: false,
          isPremium: false,
          followersCount: 10,
          followingCount: 10,
          postsCount: 1,
          createdAt: new Date(),
          followers: [],
          following: [],
          sentFollowRequests: [],
          receivedFollowRequests: [],
        },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([]);

      const result = await service.universalSearch(
        { q: 'alex', type: SearchType.ALL, limit: 20 },
        'viewer-1',
      );

      expect(result.users.length).toBe(2);
      expect(result.users[0].username).toBe('alex');
      expect(result.users[1].username).toBe('alexander_the_great');
    });

    it('should normalize queries and detect intent', () => {
      const uIntent = service.normalizeSearchQuery('  @asem   ');
      expect(uIntent.cleanText).toBe('asem');
      expect(uIntent.isUsernameIntent).toBe(true);
      expect(uIntent.isHashtagIntent).toBe(false);

      const hIntent = service.normalizeSearchQuery('#tech_trends');
      expect(hIntent.cleanText).toBe('tech_trends');
      expect(hIntent.isHashtagIntent).toBe(true);
    });

    it('should ensure exact username match dominates over high-follower prefix matches', async () => {
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u-popular',
          username: 'asem123',
          displayName: 'Asem The Popular',
          bio: 'Celebrity',
          avatarUrl: null,
          coverUrl: null,
          website: null,
          locationCity: null,
          isPrivate: false,
          isVerified: true,
          isPremium: true,
          followersCount: 500000,
          followingCount: 10,
          postsCount: 100,
          createdAt: new Date(),
          followers: [],
          following: [],
          sentFollowRequests: [],
          receivedFollowRequests: [],
        },
        {
          id: 'u-exact',
          username: 'asem',
          displayName: 'Asem',
          bio: 'Regular',
          avatarUrl: null,
          coverUrl: null,
          website: null,
          locationCity: null,
          isPrivate: false,
          isVerified: false,
          isPremium: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: new Date(),
          followers: [],
          following: [],
          sentFollowRequests: [],
          receivedFollowRequests: [],
        },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([]);

      const result = await service.universalSearch(
        { q: 'asem', type: SearchType.USERS, limit: 20 },
        'viewer-1',
      );

      expect(result.users.length).toBe(2);
      expect(result.users[0].username).toBe('asem');
      expect(result.users[1].username).toBe('asem123');
    });

    it('should exclude blocked users from search results', async () => {
      mockPrisma.block.findMany.mockResolvedValue([
        { blockerId: 'viewer-1', blockedId: 'blocked-user-id' },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.searchUsers('john', 'viewer-1');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: ['blocked-user-id'] },
          }),
        }),
      );
    });
  });

  describe('getExploreFeed', () => {
    it('should return diversified feed with freshness decay', async () => {
      mockPrisma.block.findMany.mockResolvedValue([]);
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

      mockPrisma.post.findMany.mockResolvedValue([
        {
          id: 'p-old-viral',
          content: 'Old viral post',
          createdAt: threeDaysAgo,
          likesCount: 500,
          commentsCount: 20,
          repostsCount: 5,
          bookmarksCount: 10,
          author: {
            id: 'author-1',
            username: 'viral_guy',
            displayName: 'Viral Guy',
            avatarUrl: null,
            isVerified: false,
            isPremium: false,
          },
          media: [
            {
              mediaObject: {
                id: 'm1',
                objectKey: 'posts/m1.webp',
                kind: 'IMAGE',
                mimeType: 'image/webp',
              },
            },
          ],
        },
        {
          id: 'p-fresh-trending',
          content: 'Fresh trending post',
          createdAt: oneHourAgo,
          likesCount: 80,
          commentsCount: 30,
          repostsCount: 15,
          bookmarksCount: 25,
          author: {
            id: 'author-2',
            username: 'fresh_creator',
            displayName: 'Fresh Creator',
            avatarUrl: null,
            isVerified: true,
            isPremium: true,
          },
          media: [
            {
              mediaObject: {
                id: 'm2',
                objectKey: 'posts/m2.webp',
                kind: 'IMAGE',
                mimeType: 'image/webp',
              },
            },
          ],
        },
      ]);

      const feed = await service.getExploreFeed('viewer-1');
      expect(feed.items.length).toBe(2);
      expect(feed.items[0].id).toBe('p-fresh-trending');
    });
  });

  describe('getTrendingTopics', () => {
    it('should return cached trending topics if available in Redis', async () => {
      const cached = {
        items: [
          {
            tag: '#Cyberpunk',
            postsCount: 100,
            category: 'Trending in Technology',
            velocityScore: 90,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getTrendingTopics();
      expect(result.items.length).toBe(1);
      expect(result.items[0].tag).toBe('#Cyberpunk');
      expect(mockPrisma.post.findMany).not.toHaveBeenCalled();
    });

    it('should compute dynamic trending from active posts if cache misses', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.post.findMany.mockResolvedValue([
        {
          content: 'Loving the #Design and #Cyberpunk vibe on MixChat!',
          createdAt: new Date(),
          likesCount: 10,
          commentsCount: 5,
        },
        {
          content: 'Another #Design post',
          createdAt: new Date(),
          likesCount: 20,
          commentsCount: 2,
        },
      ]);

      const result = await service.getTrendingTopics();
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should gracefully degrade when Redis throws an exception', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection timeout'));
      mockRedis.set.mockRejectedValue(new Error('Redis connection timeout'));
      mockPrisma.post.findMany.mockResolvedValue([]);

      const result = await service.getTrendingTopics();
      expect(result.items.length).toBeGreaterThan(0);
    });
  });

  describe('recent searches', () => {
    it('should retrieve recent searches from Redis', async () => {
      mockRedis.lrange.mockResolvedValue(['cyberpunk', 'alex']);
      const items = await service.getRecentSearches('user-1');
      expect(items).toEqual(['cyberpunk', 'alex']);
    });

    it('should add search term with deduplication', async () => {
      await service.addRecentSearch('user-1', 'new-term');
      expect(mockRedis.lrem).toHaveBeenCalledWith(
        'search:recents:user-1',
        0,
        'new-term',
      );
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'search:recents:user-1',
        'new-term',
      );
    });

    it('should handle Redis failure gracefully when retrieving recent searches', async () => {
      mockRedis.lrange.mockRejectedValue(new Error('Redis down'));
      const items = await service.getRecentSearches('user-1');
      expect(items).toEqual([]);
    });
  });
});
