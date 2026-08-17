import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { HashingService } from './hashing.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

describe('AuthService', () => {
  let authService: AuthService;
  let hashingService: HashingService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@mixchat.app',
    username: 'testuser',
    passwordHash: '$argon2id$mockhash',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession = {
    id: 'session-uuid-1',
    userId: 'user-uuid-1',
    refreshTokenHash: 'token-sha256-hash',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: new Date(),
    user: mockUser,
  };

  const prismaMock = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    authSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    securityEvent: {
      create: jest.fn(),
    },
    pushSubscription: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        HashingService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock_jwt_access_token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwt.refreshExpirationDays') return 7;
              if (key === 'jwt.accessExpiration') return '15m';
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    hashingService = module.get<HashingService>(HashingService);
  });

  it('should register a new user and return user + tokens', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(
      (cb: (tx: typeof prismaMock) => unknown) => {
        return Promise.resolve(cb(prismaMock));
      },
    );
    prismaMock.user.create.mockResolvedValue(mockUser);
    prismaMock.authSession.create.mockResolvedValue(mockSession);

    const result = await authService.register(
      {
        email: 'TEST@mixchat.app',
        username: 'TestUser',
        password: 'Password123!',
      },
      '127.0.0.1',
      'TestAgent',
    );

    expect(result.user.email).toBe('test@mixchat.app');
    expect(result.user.username).toBe('testuser');
    expect(result.accessToken).toBe('mock_jwt_access_token');
    expect(result.refreshToken).toBeDefined();
    const createCalls = prismaMock.user.create.mock.calls as Array<
      [{ data: { email: string; username: string; passwordHash: string } }]
    >;
    expect(createCalls[0][0].data.email).toBe('test@mixchat.app');
    expect(createCalls[0][0].data.username).toBe('testuser');
  });

  it('should reject registration if email is already taken', async () => {
    prismaMock.user.findFirst.mockResolvedValue(mockUser);

    await expect(
      authService.register({
        email: 'test@mixchat.app',
        username: 'uniqueuser',
        password: 'Password123!',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should login with valid credentials and return access + refresh tokens', async () => {
    prismaMock.user.findFirst.mockResolvedValue(mockUser);
    jest.spyOn(hashingService, 'verifyPassword').mockResolvedValue(true);
    prismaMock.$transaction.mockImplementation(
      (cb: (tx: typeof prismaMock) => unknown) => {
        return Promise.resolve(cb(prismaMock));
      },
    );
    prismaMock.authSession.create.mockResolvedValue(mockSession);

    const result = await authService.login(
      {
        identifier: 'testuser',
        password: 'Password123!',
      },
      '127.0.0.1',
    );

    expect(result.user.id).toBe(mockUser.id);
    expect(result.accessToken).toBe('mock_jwt_access_token');
    expect(result.refreshToken).toBeDefined();
  });

  it('should reject login with invalid password', async () => {
    prismaMock.user.findFirst.mockResolvedValue(mockUser);
    jest.spyOn(hashingService, 'verifyPassword').mockResolvedValue(false);

    await expect(
      authService.login({
        identifier: 'testuser',
        password: 'WrongPassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should rotate refresh token and issue new access token', async () => {
    prismaMock.authSession.findFirst.mockResolvedValue(mockSession);
    prismaMock.$transaction.mockImplementation(
      (cb: (tx: typeof prismaMock) => unknown) => {
        return Promise.resolve(cb(prismaMock));
      },
    );

    const result = await authService.refresh('valid-raw-refresh-token');

    expect(result.accessToken).toBe('mock_jwt_access_token');
    expect(result.refreshToken).toBeDefined();
    expect(prismaMock.authSession.update).toHaveBeenCalled();
  });

  it('should detect refresh token reuse, revoke all sessions and throw UnauthorizedException', async () => {
    const revokedSession = {
      ...mockSession,
      revokedAt: new Date(),
    };

    prismaMock.authSession.findFirst.mockResolvedValue(revokedSession);
    prismaMock.$transaction.mockResolvedValue([]);

    await expect(authService.refresh('already-revoked-token')).rejects.toThrow(
      UnauthorizedException,
    );

    const updateCalls = prismaMock.authSession.updateMany.mock.calls as Array<
      [{ where: { userId: string; revokedAt: null } }]
    >;
    expect(updateCalls[0][0].where.userId).toBe(mockUser.id);
  });

  it('should revoke all sessions on logoutAll', async () => {
    prismaMock.$transaction.mockResolvedValue([]);

    await authService.logoutAll('user-uuid-1', '127.0.0.1');

    const updateCalls = prismaMock.authSession.updateMany.mock.calls as Array<
      [{ where: { userId: string; revokedAt: null } }]
    >;
    expect(updateCalls[0][0].where.userId).toBe('user-uuid-1');
  });
});
