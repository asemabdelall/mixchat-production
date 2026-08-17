import { Test, TestingModule } from '@nestjs/testing';
import { ReelsService } from './reels.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MediaService } from '../media/media.service';
import { ReelsPolicyService } from './reels-policy.service';
import { ReelsRankingService } from './reels-ranking.service';
import {
  MediaKind,
  MediaStatus,
  PostStatus,
  PostVisibility,
} from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ReelsService', () => {
  let service: ReelsService;
  let prisma: any;
  let mediaService: any;
  let policyService: any;
  let rankingService: any;

  const mockUser = {
    id: 'user-1',
    username: 'test_creator',
    displayName: 'Test Creator',
    avatarUrl: 'https://example.com/avatar.jpg',
    isVerified: true,
    isPremium: false,
    isPrivate: false,
  };

  const mockVideoMedia = {
    id: 'media-video-1',
    ownerId: 'user-1',
    status: MediaStatus.READY,
    kind: MediaKind.VIDEO,
    mimeType: 'video/mp4',
    width: 1080,
    height: 1920,
    durationMs: 12000,
  };

  const mockReel = {
    id: 'reel-1',
    authorId: 'user-1',
    author: mockUser,
    mediaObjectId: 'media-video-1',
    mediaObject: mockVideoMedia,
    posterMediaObjectId: null,
    posterMediaObject: null,
    caption: 'My first reel #fun',
    audioTitle: 'Original Track',
    locationTag: 'Dubai, UAE',
    visibility: PostVisibility.PUBLIC,
    status: PostStatus.PUBLISHED,
    likesCount: 5,
    commentsCount: 2,
    bookmarksCount: 1,
    viewsCount: 100,
    sharesCount: 0,
    durationMs: 12000,
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: [],
    bookmarks: [],
  };

  beforeEach(async () => {
    prisma = {
      reel: {
        create: jest.fn().mockResolvedValue(mockReel),
        findUnique: jest.fn().mockResolvedValue(mockReel),
        findMany: jest.fn().mockResolvedValue([mockReel]),
        update: jest.fn().mockResolvedValue(mockReel),
      },
      reelLike: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      reelBookmark: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      reelWatchSession: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      mediaObject: {
        findUnique: jest.fn().mockResolvedValue(mockVideoMedia),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
      },
      follow: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      closeFriend: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      block: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    mediaService = {
      toDto: jest.fn().mockResolvedValue({
        id: 'media-video-1',
        publicUrl: 'https://r2.mixchat.com/video.mp4',
      }),
    };

    policyService = {
      assertCanAccessReel: jest.fn().mockResolvedValue(mockReel),
      assertCanDelete: jest.fn(),
      getBlockedUserIds: jest.fn().mockResolvedValue(new Set()),
    };

    rankingService = {
      encodeCursor: jest.fn().mockReturnValue('cursor-123'),
      decodeCursor: jest.fn().mockReturnValue(null),
      rankForYouCandidates: jest.fn().mockResolvedValue({
        items: [
          {
            ...mockReel,
            rankingScore: 85,
            isFollowing: false,
            hasLiked: false,
            hasBookmarked: false,
          },
        ],
        nextCursor: null,
        hasMore: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReelsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MediaService, useValue: mediaService },
        { provide: ReelsPolicyService, useValue: policyService },
        { provide: ReelsRankingService, useValue: rankingService },
      ],
    }).compile();

    service = module.get<ReelsService>(ReelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReel', () => {
    it('should create a valid Reel from READY video MediaObject', async () => {
      const res = await service.createReel('user-1', {
        mediaObjectId: 'media-video-1',
        caption: 'My first reel #fun',
      });

      expect(res.id).toBe('reel-1');
      expect(res.video.url).toBe('https://r2.mixchat.com/video.mp4');
      expect(res.caption).toBe('My first reel #fun');
      expect(prisma.reel.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user does not own media', async () => {
      prisma.mediaObject.findUnique.mockResolvedValueOnce({
        ...mockVideoMedia,
        ownerId: 'other-user',
      });

      await expect(
        service.createReel('user-1', { mediaObjectId: 'media-video-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if media is not READY', async () => {
      prisma.mediaObject.findUnique.mockResolvedValueOnce({
        ...mockVideoMedia,
        status: MediaStatus.PENDING,
      });

      await expect(
        service.createReel('user-1', { mediaObjectId: 'media-video-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if media is not VIDEO', async () => {
      prisma.mediaObject.findUnique.mockResolvedValueOnce({
        ...mockVideoMedia,
        kind: MediaKind.IMAGE,
      });

      await expect(
        service.createReel('user-1', { mediaObjectId: 'media-video-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('likes and bookmarks', () => {
    it('should idempotently like a reel', async () => {
      prisma.reelLike.findUnique.mockResolvedValueOnce(null);
      prisma.reel.update.mockResolvedValueOnce({ likesCount: 6 });

      const res = await service.likeReel('user-1', 'reel-1');
      expect(res.liked).toBe(true);
      expect(res.likesCount).toBe(6);
    });

    it('should idempotently unlike a reel', async () => {
      prisma.reelLike.findUnique.mockResolvedValueOnce({ id: 'like-1' });
      prisma.reel.update.mockResolvedValueOnce({ likesCount: 5 });

      const res = await service.unlikeReel('user-1', 'reel-1');
      expect(res.liked).toBe(false);
      expect(res.likesCount).toBe(5);
    });

    it('should bookmark and unbookmark a reel', async () => {
      prisma.reelBookmark.findUnique.mockResolvedValueOnce(null);
      prisma.reel.update.mockResolvedValueOnce({ bookmarksCount: 2 });

      const res = await service.bookmarkReel('user-1', 'reel-1');
      expect(res.bookmarked).toBe(true);
      expect(res.bookmarksCount).toBe(2);
    });
  });

  describe('watch telemetry', () => {
    it('should qualify view when watchedMs >= 2000', async () => {
      prisma.reelWatchSession.findUnique.mockResolvedValueOnce({
        id: 'session-1',
        viewerId: 'user-1',
        sessionId: 'sess-abc',
        watchedMs: 500,
        isQualifiedView: false,
        isCompleted: false,
      });

      const res = await service.recordWatchProgress('user-1', 'reel-1', {
        sessionId: 'sess-abc',
        watchedMs: 2500,
        maxProgressMs: 2500,
        durationMs: 12000,
        completionRatio: 0.208,
      });

      expect(res.isQualifiedView).toBe(true);
      expect(res.isCompleted).toBe(false);
      expect(prisma.reel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { viewsCount: { increment: 1 } },
        }),
      );
    });

    it('should mark completed when completionRatio >= 0.9', async () => {
      prisma.reelWatchSession.findUnique.mockResolvedValueOnce({
        id: 'session-1',
        viewerId: 'user-1',
        sessionId: 'sess-abc',
        watchedMs: 10000,
        isQualifiedView: true,
        isCompleted: false,
      });

      const res = await service.recordWatchProgress('user-1', 'reel-1', {
        sessionId: 'sess-abc',
        watchedMs: 11000,
        maxProgressMs: 11000,
        durationMs: 12000,
        completionRatio: 0.92,
      });

      expect(res.isCompleted).toBe(true);
    });
  });
});
