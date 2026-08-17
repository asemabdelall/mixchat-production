import { Test, TestingModule } from '@nestjs/testing';
import { StoriesService } from './stories.service';
import { StoriesPolicyService } from './stories-policy.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MediaService } from '../media/media.service';
import {
  MediaKind,
  MediaStatus,
  StoryAudience,
  StoryReactionType,
  StoryStatus,
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('StoriesService', () => {
  let service: StoriesService;

  const mockPrisma = {
    story: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    storyView: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    storyReaction: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    storyReply: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    mediaObject: {
      findUnique: jest.fn(),
    },
    block: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    mute: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    follow: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    closeFriend: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest
      .fn()
      .mockImplementation(async (callback) => await callback(mockPrisma)),
  };

  const mockMediaService = {
    toDto: jest.fn().mockImplementation((m) =>
      Promise.resolve({
        ...m,
        publicUrl: `https://cdn.mixchat.app/${m.objectKey || 'story.webp'}`,
      }),
    ),
  };

  const mockPolicy = {
    assertCanViewStory: jest.fn(),
    assertCanReact: jest.fn(),
    assertCanReply: jest.fn(),
    assertCanViewViewersList: jest.fn(),
    assertCanViewReplies: jest.fn(),
    assertCanDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MediaService, useValue: mockMediaService },
        { provide: StoriesPolicyService, useValue: mockPolicy },
      ],
    }).compile();

    service = module.get<StoriesService>(StoriesService);

    jest.clearAllMocks();
  });

  describe('createStory', () => {
    it('should throw if media does not exist', async () => {
      mockPrisma.mediaObject.findUnique.mockResolvedValue(null);

      await expect(
        service.createStory('user-1', {
          mediaObjectId: 'missing-media',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if media is not owned by current user', async () => {
      mockPrisma.mediaObject.findUnique.mockResolvedValue({
        id: 'media-1',
        ownerId: 'other-user',
        status: MediaStatus.READY,
        kind: MediaKind.IMAGE,
      });

      await expect(
        service.createStory('user-1', {
          mediaObjectId: 'media-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if media status is not READY', async () => {
      mockPrisma.mediaObject.findUnique.mockResolvedValue({
        id: 'media-1',
        ownerId: 'user-1',
        status: MediaStatus.PENDING,
        kind: MediaKind.IMAGE,
      });

      await expect(
        service.createStory('user-1', {
          mediaObjectId: 'media-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create 24h story successfully', async () => {
      mockPrisma.mediaObject.findUnique.mockResolvedValue({
        id: 'media-1',
        ownerId: 'user-1',
        status: MediaStatus.READY,
        kind: MediaKind.IMAGE,
        objectKey: 'stories/test.webp',
        mimeType: 'image/webp',
        width: 1080,
        height: 1920,
        durationMs: null,
      });

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      mockPrisma.story.create.mockResolvedValue({
        id: 'story-1',
        authorId: 'user-1',
        mediaObjectId: 'media-1',
        caption: 'Sunset vibes',
        audience: StoryAudience.PUBLIC,
        status: StoryStatus.ACTIVE,
        viewsCount: 0,
        createdAt: now,
        expiresAt,
        author: {
          id: 'user-1',
          username: 'alex',
          displayName: 'Alex Morgan',
          avatarUrl: null,
          isVerified: true,
          isPremium: false,
        },
        mediaObject: {
          id: 'media-1',
          objectKey: 'stories/test.webp',
          kind: MediaKind.IMAGE,
          mimeType: 'image/webp',
          width: 1080,
          height: 1920,
          durationMs: null,
        },
        views: [],
        reactions: [],
      });

      const result = await service.createStory('user-1', {
        mediaObjectId: 'media-1',
        caption: 'Sunset vibes',
      });

      expect(result.id).toBe('story-1');
      expect(result.author.username).toBe('alex');
      expect(result.media.url).toContain('test.webp');
    });
  });

  describe('getActiveStories', () => {
    it('should group active stories by author with unseen prioritization', async () => {
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.follow.findMany.mockResolvedValue([{ followingId: 'user-2' }]);
      mockPrisma.closeFriend.findMany.mockResolvedValue([]);

      const now = new Date();
      mockPrisma.story.findMany.mockResolvedValue([
        {
          id: 'story-1',
          authorId: 'user-1', // Own story
          mediaObjectId: 'media-1',
          caption: 'My story',
          audience: StoryAudience.PUBLIC,
          status: StoryStatus.ACTIVE,
          viewsCount: 5,
          createdAt: new Date(now.getTime() - 10000),
          expiresAt: new Date(now.getTime() + 80000),
          author: {
            id: 'user-1',
            username: 'alex',
            displayName: 'Alex',
            avatarUrl: null,
            isVerified: false,
            isPremium: false,
          },
          mediaObject: {
            id: 'media-1',
            kind: MediaKind.IMAGE,
            mimeType: 'image/webp',
          },
          views: [{ viewerId: 'user-1' }],
          reactions: [],
        },
        {
          id: 'story-2',
          authorId: 'user-2', // Followed user story (unseen)
          mediaObjectId: 'media-2',
          caption: 'Friend story',
          audience: StoryAudience.FOLLOWERS,
          status: StoryStatus.ACTIVE,
          viewsCount: 10,
          createdAt: new Date(now.getTime() - 5000),
          expiresAt: new Date(now.getTime() + 85000),
          author: {
            id: 'user-2',
            username: 'sarah',
            displayName: 'Sarah',
            avatarUrl: null,
            isVerified: true,
            isPremium: false,
          },
          mediaObject: {
            id: 'media-2',
            kind: MediaKind.IMAGE,
            mimeType: 'image/webp',
          },
          views: [], // Unseen by viewer
          reactions: [],
        },
      ]);

      const res = await service.getActiveStories('user-1');

      expect(res.groups.length).toBe(2);
      expect(res.groups[0].author.id).toBe('user-1'); // Own group is first
      expect(res.groups[1].author.id).toBe('user-2');
      expect(res.groups[1].hasUnseen).toBe(true);
    });
  });

  describe('recordView', () => {
    it('should record unique view and increment viewsCount atomically', async () => {
      mockPrisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        authorId: 'author-user',
        status: StoryStatus.ACTIVE,
      });
      mockPrisma.storyView.findUnique.mockResolvedValue(null); // First view

      const res = await service.recordView('story-1', 'viewer-user');

      expect(res.success).toBe(true);
      expect(mockPrisma.storyView.create).toHaveBeenCalledWith({
        data: { storyId: 'story-1', viewerId: 'viewer-user' },
      });
      expect(mockPrisma.story.update).toHaveBeenCalledWith({
        where: { id: 'story-1' },
        data: { viewsCount: { increment: 1 } },
      });
    });

    it('should not increment viewsCount if author views own story', async () => {
      mockPrisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        authorId: 'author-user',
        status: StoryStatus.ACTIVE,
      });

      const res = await service.recordView('story-1', 'author-user');

      expect(res.success).toBe(true);
      expect(mockPrisma.storyView.create).not.toHaveBeenCalled();
    });
  });

  describe('reactToStory', () => {
    it('should upsert reaction cleanly', async () => {
      mockPrisma.story.findUnique.mockResolvedValue({
        id: 'story-1',
        authorId: 'author-user',
      });

      const res = await service.reactToStory('story-1', 'viewer-user', {
        reaction: StoryReactionType.FIRE,
      });

      expect(res.success).toBe(true);
      expect(res.reaction).toBe(StoryReactionType.FIRE);
      expect(mockPrisma.storyReaction.upsert).toHaveBeenCalled();
    });
  });

  describe('expireActiveStoriesBatch', () => {
    it('should update expired stories in batch', async () => {
      mockPrisma.story.updateMany.mockResolvedValue({ count: 3 });

      const count = await service.expireActiveStoriesBatch();
      expect(count).toBe(3);
      expect(mockPrisma.story.updateMany).toHaveBeenCalledWith({
        where: {
          status: StoryStatus.ACTIVE,
          expiresAt: { lte: expect.any(Date) },
        },
        data: {
          status: StoryStatus.EXPIRED,
        },
      });
    });
  });
});
