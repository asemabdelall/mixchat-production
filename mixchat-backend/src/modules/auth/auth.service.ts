import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { HashingService } from './hashing.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserDto } from './dto/auth-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { User, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

export interface AuthResult {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTtlDays: number;
  private readonly accessTtl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.refreshTtlDays =
      this.configService.get<number>('jwt.refreshExpirationDays') ?? 7;
    this.accessTtl =
      this.configService.get<string>('jwt.accessExpiration') ?? '15m';
  }

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

  private calculateExpiryDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + this.refreshTtlDays);
    return date;
  }

  private generateAccessToken(user: User, sessionId: string): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        sessionId,
        role: user.role,
        jti: randomUUID(),
      },
      { expiresIn: this.accessTtl as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );
  }

  /**
   * Register a new user account atomically with initial session
   */
  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedUsername = dto.username.trim().toLowerCase();

    // Check for existing user
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
      },
    });

    if (existing) {
      if (existing.email === normalizedEmail) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw new ConflictException('This username is already taken');
    }

    const passwordHash = await this.hashingService.hashPassword(dto.password);
    const rawRefreshToken = this.hashingService.generateOpaqueToken();
    const refreshTokenHash = this.hashingService.hashToken(rawRefreshToken);
    const expiresAt = this.calculateExpiryDate();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: normalizedEmail,
            username: normalizedUsername,
            displayName: normalizedUsername,
            passwordHash,
          },
        });

        const session = await tx.authSession.create({
          data: {
            userId: user.id,
            refreshTokenHash,
            expiresAt,
            ipAddress,
            userAgent,
          },
        });

        await tx.securityEvent.create({
          data: {
            userId: user.id,
            eventType: 'account_registered',
            ipAddress,
            userAgent,
          },
        });

        return { user, session };
      });

      const accessToken = this.generateAccessToken(
        result.user,
        result.session.id,
      );

      return {
        user: this.mapUserToDto(result.user),
        accessToken,
        refreshToken: rawRefreshToken,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or username is already registered');
      }
      throw error;
    }
  }

  /**
   * Login with email or username and issue rotating session
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const identifier = dto.identifier.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      // Perform dummy Argon2 verification to avoid timing side-channels
      await this.hashingService.hashPassword(
        'dummy_timing_protection_password',
      );
      throw new UnauthorizedException('Invalid email/username or password');
    }

    if (user.status === 'DISABLED') {
      throw new ForbiddenException('This account has been disabled');
    }

    const isValid = await this.hashingService.verifyPassword(
      user.passwordHash,
      dto.password,
    );

    if (!isValid) {
      await this.prisma.securityEvent.create({
        data: {
          userId: user.id,
          eventType: 'login_failed',
          ipAddress,
          userAgent,
        },
      });
      throw new UnauthorizedException('Invalid email/username or password');
    }

    const rawRefreshToken = this.hashingService.generateOpaqueToken();
    const refreshTokenHash = this.hashingService.hashToken(rawRefreshToken);
    const expiresAt = this.calculateExpiryDate();

    const session = await this.prisma.$transaction(async (tx) => {
      const s = await tx.authSession.create({
        data: {
          userId: user.id,
          refreshTokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      await tx.securityEvent.create({
        data: {
          userId: user.id,
          eventType: 'login_succeeded',
          ipAddress,
          userAgent,
        },
      });

      return s;
    });

    const accessToken = this.generateAccessToken(user, session.id);

    return {
      user: this.mapUserToDto(user),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Rotate refresh token and issue new short-lived access token
   * Includes token reuse detection
   */
  async refresh(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashingService.hashToken(rawRefreshToken);

    // 1. Try finding active session by current refreshTokenHash
    let session = await this.prisma.authSession.findFirst({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    // 2. If not found, check if it's a recently rotated token in the grace period (30s)
    if (!session) {
      const gracePeriodSession = await this.prisma.authSession.findFirst({
        where: { prevRefreshTokenHash: tokenHash },
        include: { user: true },
      });

      if (gracePeriodSession) {
        const graceWindowMs = 30 * 1000; // 30 seconds
        const isWithinGrace =
          gracePeriodSession.prevRotatedAt &&
          Date.now() - gracePeriodSession.prevRotatedAt.getTime() <
            graceWindowMs;

        if (
          isWithinGrace &&
          !gracePeriodSession.revokedAt &&
          gracePeriodSession.expiresAt >= new Date()
        ) {
          this.logger.log(
            `ℹ️ Concurrent refresh token presented within grace window for session ${gracePeriodSession.id}. Returning valid session.`,
          );
          const accessToken = this.generateAccessToken(
            gracePeriodSession.user,
            gracePeriodSession.id,
          );
          return {
            user: this.mapUserToDto(gracePeriodSession.user),
            accessToken,
            refreshToken: rawRefreshToken,
          };
        }

        // If outside grace window, treat as theft/reuse
        session = gracePeriodSession;
      }
    }

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Token Reuse / Theft Detection
    if (session.revokedAt) {
      this.logger.warn(
        `🚨 Refresh token reuse detected for user ${session.userId}, session ${session.id}! Revoking all sessions.`,
      );

      await this.prisma.$transaction([
        this.prisma.authSession.updateMany({
          where: { userId: session.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        this.prisma.securityEvent.create({
          data: {
            userId: session.userId,
            eventType: 'refresh_reuse_detected',
            ipAddress,
            userAgent,
            metadata: { compromisedSessionId: session.id },
          },
        }),
      ]);

      throw new UnauthorizedException(
        'Session security violation detected. All sessions terminated. Please log in again.',
      );
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!session.user || session.user.status === 'DISABLED') {
      throw new UnauthorizedException('User account is inactive or disabled');
    }

    // Rotate refresh token atomically with previous token tracking
    const newRawRefreshToken = this.hashingService.generateOpaqueToken();
    const newRefreshTokenHash =
      this.hashingService.hashToken(newRawRefreshToken);
    const newExpiresAt = this.calculateExpiryDate();

    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.update({
        where: { id: session.id },
        data: {
          prevRefreshTokenHash: session.refreshTokenHash,
          prevRotatedAt: new Date(),
          refreshTokenHash: newRefreshTokenHash,
          lastUsedAt: new Date(),
          expiresAt: newExpiresAt,
          ipAddress: ipAddress ?? session.ipAddress,
          userAgent: userAgent ?? session.userAgent,
        },
      });

      await tx.securityEvent.create({
        data: {
          userId: session.userId,
          eventType: 'refresh_rotated',
          ipAddress,
          userAgent,
        },
      });
    });

    const accessToken = this.generateAccessToken(session.user, session.id);

    return {
      user: this.mapUserToDto(session.user),
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * Log out current session
   */
  async logout(
    rawRefreshToken?: string,
    currentSessionId?: string,
    ipAddress?: string,
  ): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = this.hashingService.hashToken(rawRefreshToken);
      const session = await this.prisma.authSession.findFirst({
        where: { refreshTokenHash: tokenHash },
      });

      if (session && !session.revokedAt) {
        await this.prisma.$transaction([
          this.prisma.authSession.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
          }),
          this.prisma.securityEvent.create({
            data: {
              userId: session.userId,
              eventType: 'logout',
              ipAddress,
            },
          }),
        ]);
        return;
      }
    }

    if (currentSessionId) {
      const session = await this.prisma.authSession.findUnique({
        where: { id: currentSessionId },
      });
      if (session && !session.revokedAt) {
        await this.prisma.$transaction([
          this.prisma.authSession.update({
            where: { id: currentSessionId },
            data: { revokedAt: new Date() },
          }),
          this.prisma.securityEvent.create({
            data: {
              userId: session.userId,
              eventType: 'logout',
              ipAddress,
            },
          }),
        ]);
      }
    }
  }

  /**
   * Log out of all active sessions across all devices
   */
  async logoutAll(userId: string, ipAddress?: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.pushSubscription.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.securityEvent.create({
        data: {
          userId,
          eventType: 'logout_all',
          ipAddress,
        },
      }),
    ]);
  }

  /**
   * Get authenticated user account profile
   */
  async getMe(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status === 'DISABLED') {
      throw new NotFoundException('User not found or disabled');
    }

    return this.mapUserToDto(user);
  }

  /**
   * Get active sessions for current user
   */
  async getSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionResponseDto[]> {
    const sessions = await this.prisma.authSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      lastUsedAt: s.lastUsedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      isCurrent: s.id === currentSessionId,
    }));
  }

  /**
   * Revoke specific session belonging to user
   */
  async revokeSession(userId: string, targetSessionId: string): Promise<void> {
    const session = await this.prisma.authSession.findUnique({
      where: { id: targetSessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }

    if (!session.revokedAt) {
      await this.prisma.$transaction([
        this.prisma.authSession.update({
          where: { id: targetSessionId },
          data: { revokedAt: new Date() },
        }),
        this.prisma.securityEvent.create({
          data: {
            userId,
            eventType: 'session_revoked',
            metadata: { targetSessionId },
          },
        }),
      ]);
    }
  }
}
