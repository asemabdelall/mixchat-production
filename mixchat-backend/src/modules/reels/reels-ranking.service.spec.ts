import { Test, TestingModule } from '@nestjs/testing';
import { ReelsRankingService } from './reels-ranking.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PostStatus, PostVisibility } from '@prisma/client';

describe('ReelsRankingService', () => {
  let service: ReelsRankingService;
  let prisma: any;

  const candidate1 = {
    id: 'reel-fresh',
    authorId: 'author-1',
    mediaObjectId: 'media-1',
    posterMediaObjectId: null,
    caption: 'Fresh video',
    audioTitle: null,
    locationTag: null,
    visibility: PostVisibility.PUBLIC,
    status: PostStatus.PUBLISHED,
    likesCount: 10,
    commentsCount: 2,
    bookmarksCount: 1,
    viewsCount: 50,
    sharesCount: 0,
    durationMs: 15000,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'author-1',
      username: 'creator1',
      displayName: 'Creator One',
      avatarUrl: null,
      isVerified: true,
      isPremium: false,
      isPrivate: false,
    },
    mediaObject: {},
    posterMediaObject: null,
    likes: [],
    bookmarks: [],
  };

  const candidate2 = {
    id: 'reel-old',
    authorId: 'author-2',
    mediaObjectId: 'media-2',
    posterMediaObjectId: null,
    caption: 'Old video',
    audioTitle: null,
    locationTag: null,
    visibility: PostVisibility.PUBLIC,
    status: PostStatus.PUBLISHED,
    likesCount: 0,
    commentsCount: 0,
    bookmarksCount: 0,
    viewsCount: 0,
    sharesCount: 0,
    durationMs: 10000,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
    updatedAt: new Date(),
    author: {
      id: 'author-2',
      username: 'creator2',
      displayName: 'Creator Two',
      avatarUrl: null,
      isVerified: false,
      isPremium: false,
      isPrivate: false,
    },
    mediaObject: {},
    posterMediaObject: null,
    likes: [],
    bookmarks: [],
  };

  beforeEach(async () => {
    prisma = {
      follow: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      closeFriend: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      reelWatchSession: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      reel: {
        findMany: jest.fn().mockResolvedValue([candidate1, candidate2]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReelsRankingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReelsRankingService>(ReelsRankingService);
  });

  it('should rank fresh engaging reels higher than old zero-engagement reels', async () => {
    const res = await service.rankForYouCandidates(
      'viewer-1',
      new Set(),
      null,
      10,
    );

    expect(res.items.length).toBe(2);
    expect(res.items[0].id).toBe('reel-fresh');
    expect(res.items[1].id).toBe('reel-old');
    expect(res.items[0].rankingScore).toBeGreaterThan(
      res.items[1].rankingScore,
    );
  });

  it('should encode and decode cursor correctly', () => {
    const encoded = service.encodeCursor(
      95.4,
      new Date('2026-08-14T20:00:00Z'),
      'reel-123',
    );
    expect(typeof encoded).toBe('string');

    const decoded = service.decodeCursor(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.score).toBe(95.4);
    expect(decoded?.id).toBe('reel-123');
  });
});
