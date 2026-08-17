import { Test, TestingModule } from '@nestjs/testing';
import { SocialService } from './social.service';
import { SocialPolicyService } from './social-policy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { RelationshipState, UserRole, UserStatus } from '@prisma/client';

describe('SocialService', () => {
  let service: SocialService;

  const mockUserA = {
    id: 'user-a-id',
    email: 'usera@mixchat.app',
    username: 'usera',
    displayName: 'User A',
    isPrivate: false,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    followersCount: 0,
    followingCount: 0,
  };

  const mockUserB = {
    id: 'user-b-id',
    email: 'userb@mixchat.app',
    username: 'userb',
    displayName: 'User B',
    isPrivate: true,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    followersCount: 0,
    followingCount: 0,
  };

  const prismaMock: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    follow: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    followRequest: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    block: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    closeFriend: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  } = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    follow: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    followRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    block: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    closeFriend: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: typeof prismaMock) => unknown) => {
      return Promise.resolve(cb(prismaMock));
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        SocialPolicyService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<SocialService>(SocialService);
  });

  it('should reject follow self', async () => {
    await expect(service.followUser('user-a-id', 'user-a-id')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should follow public user directly and increment counters', async () => {
    prismaMock.block.findMany.mockResolvedValue([]);
    prismaMock.user.findUnique.mockResolvedValue(mockUserA);
    prismaMock.follow.findUnique.mockResolvedValue(null);
    prismaMock.followRequest.findUnique.mockResolvedValue(null);

    const result = await service.followUser('user-b-id', 'user-a-id');

    expect(result.message).toBe('Followed successfully');
    expect(prismaMock.follow.create).toHaveBeenCalledWith({
      data: {
        followerId: 'user-b-id',
        followingId: 'user-a-id',
      },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-b-id' },
      data: { followingCount: { increment: 1 } },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a-id' },
      data: { followersCount: { increment: 1 } },
    });
  });

  it('should create follow request when following private user', async () => {
    prismaMock.block.findMany.mockResolvedValue([]);
    prismaMock.user.findUnique.mockResolvedValue(mockUserB);
    prismaMock.follow.findUnique.mockResolvedValue(null);
    prismaMock.followRequest.findUnique.mockResolvedValue(null);

    const result = await service.followUser('user-a-id', 'user-b-id');

    expect(result.relationshipState).toBe(RelationshipState.REQUESTED);
    expect(result.message).toBe('Follow request sent successfully');
    expect(prismaMock.followRequest.create).toHaveBeenCalledWith({
      data: {
        requesterId: 'user-a-id',
        targetId: 'user-b-id',
      },
    });
  });

  it('should unfollow user and decrement counters', async () => {
    prismaMock.followRequest.findUnique.mockResolvedValue(null);
    prismaMock.follow.findUnique.mockResolvedValue({ id: 'follow-1' });
    prismaMock.block.findMany.mockResolvedValue([]);

    const result = await service.unfollowUser('user-a-id', 'user-b-id');

    expect(result.message).toBe('Unfollowed successfully');
    expect(prismaMock.follow.delete).toHaveBeenCalledWith({
      where: { id: 'follow-1' },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a-id' },
      data: { followingCount: { decrement: 1 } },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-b-id' },
      data: { followersCount: { decrement: 1 } },
    });
  });

  it('should accept follow request, create follow relationship, and update counters', async () => {
    prismaMock.followRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      requesterId: 'user-a-id',
      targetId: 'user-b-id',
      requester: mockUserA,
    });
    prismaMock.follow.findUnique.mockResolvedValue(null);

    const result = await service.acceptFollowRequest('user-b-id', 'req-1');

    expect(result.message).toBe('Follow request accepted');
    expect(prismaMock.followRequest.delete).toHaveBeenCalledWith({
      where: { id: 'req-1' },
    });
    expect(prismaMock.follow.create).toHaveBeenCalledWith({
      data: {
        followerId: 'user-a-id',
        followingId: 'user-b-id',
      },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-a-id' },
      data: { followingCount: { increment: 1 } },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-b-id' },
      data: { followersCount: { increment: 1 } },
    });
  });

  it('should block user atomically removing follows, requests and close friends in both directions', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUserB);
    prismaMock.block.findUnique.mockResolvedValue(null);
    prismaMock.follow.findUnique
      .mockResolvedValueOnce({ id: 'follow-a-to-b' })
      .mockResolvedValueOnce({ id: 'follow-b-to-a' });

    const result = await service.blockUser('user-a-id', 'user-b-id');

    expect(result.message).toBe('User blocked successfully');
    expect(prismaMock.block.create).toHaveBeenCalledWith({
      data: {
        blockerId: 'user-a-id',
        blockedId: 'user-b-id',
      },
    });
    expect(prismaMock.follow.delete).toHaveBeenCalledWith({
      where: { id: 'follow-a-to-b' },
    });
    expect(prismaMock.follow.delete).toHaveBeenCalledWith({
      where: { id: 'follow-b-to-a' },
    });
    expect(prismaMock.followRequest.deleteMany).toHaveBeenCalled();
    expect(prismaMock.closeFriend.deleteMany).toHaveBeenCalled();
  });

  it('should add and remove close friends correctly', async () => {
    prismaMock.block.findMany.mockResolvedValue([]);
    prismaMock.closeFriend.findUnique.mockResolvedValue(null);

    const addResult = await service.addCloseFriend('user-a-id', 'user-b-id');
    expect(addResult.message).toBe('Added to close friends');
    expect(prismaMock.closeFriend.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-a-id',
        friendId: 'user-b-id',
      },
    });

    prismaMock.closeFriend.findUnique.mockResolvedValue({ id: 'cf-1' });
    const removeResult = await service.removeCloseFriend(
      'user-a-id',
      'user-b-id',
    );
    expect(removeResult.message).toBe('Removed from close friends');
    expect(prismaMock.closeFriend.delete).toHaveBeenCalledWith({
      where: { id: 'cf-1' },
    });
  });
});
