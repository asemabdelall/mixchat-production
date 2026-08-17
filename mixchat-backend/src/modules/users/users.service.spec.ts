import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { SocialPolicyService } from '../social/social-policy.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus, RelationshipState } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-1-id',
    email: 'alex@mixchat.app',
    username: 'alexvance',
    displayName: 'Alex Vance',
    bio: 'Tech enthusiast',
    avatarUrl: null,
    coverUrl: null,
    website: null,
    locationCity: 'SF',
    isPrivate: false,
    isVerified: true,
    isPremium: false,
    followersCount: 10,
    followingCount: 5,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prismaMock: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    followRequest: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    follow: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    block: {
      findMany: jest.Mock;
    };
    privacySettings: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
    };
    $transaction: jest.Mock;
  } = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    followRequest: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    follow: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    block: {
      findMany: jest.fn(),
    },
    privacySettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: typeof prismaMock) => unknown) => {
      return Promise.resolve(cb(prismaMock));
    }),
  };

  const policyMock: {
    isBlockedEitherDirection: jest.Mock;
    getRelationshipState: jest.Mock;
    getRelationshipSnapshots: jest.Mock;
    isCloseFriend: jest.Mock;
  } = {
    isBlockedEitherDirection: jest.fn().mockResolvedValue({
      blockedByA: false,
      blockedByB: false,
      isBlocked: false,
    }),
    getRelationshipState: jest.fn().mockResolvedValue(RelationshipState.NONE),
    getRelationshipSnapshots: jest.fn().mockResolvedValue(
      new Map([
        [
          mockUser.id,
          {
            relationshipState: RelationshipState.NONE,
            isCloseFriend: false,
          },
        ],
      ]),
    ),
    isCloseFriend: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: SocialPolicyService,
          useValue: policyMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should get own profile', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.getOwnProfile('user-1-id');

    expect(result.username).toBe('alexvance');
    expect(result.displayName).toBe('Alex Vance');
    expect(result.followersCount).toBe(10);
  });

  it('should update own profile displayName and bio', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.user.update.mockResolvedValue({
      ...mockUser,
      displayName: 'Alex Updated',
      bio: 'New bio',
    });

    const result = await service.updateOwnProfile('user-1-id', {
      displayName: 'Alex Updated',
      bio: 'New bio',
    });

    expect(result.displayName).toBe('Alex Updated');
    expect(result.bio).toBe('New bio');
  });

  it('should reject username update if already taken', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce({ id: 'other-user', username: 'takenusername' });

    await expect(
      service.updateOwnProfile('user-1-id', { username: 'takenusername' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should get public profile and include relationship state', async () => {
    prismaMock.user.findFirst.mockResolvedValue(mockUser);

    const profile = await service.getPublicProfile('viewer-id', 'alexvance');

    expect(profile.username).toBe('alexvance');
    expect(profile.relationshipState).toBe(RelationshipState.NONE);
    expect(profile.isCloseFriend).toBe(false);
  });

  it('should throw NotFoundException when viewer is blocked by target user', async () => {
    prismaMock.user.findFirst.mockResolvedValue(mockUser);
    policyMock.isBlockedEitherDirection.mockResolvedValueOnce({
      blockedByA: false,
      blockedByB: true,
      isBlocked: true,
    });

    await expect(
      service.getPublicProfile('viewer-id', 'alexvance'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should search users and filter out blocked accounts', async () => {
    prismaMock.block.findMany.mockResolvedValue([
      { blockerId: 'viewer-id', blockedId: 'blocked-user-id' },
    ]);
    prismaMock.user.findMany.mockResolvedValue([mockUser]);

    const results = await service.searchUsers('viewer-id', 'alex');

    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('alexvance');
  });
});
