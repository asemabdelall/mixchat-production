import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  sessionId: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret =
      configService.get<string>('jwt.secret') ||
      'mixchat_jwt_super_secret_development_key_32bytes_long';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.sessionId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session is expired or has been revoked');
    }

    if (!session.user || session.user.status === 'DISABLED') {
      throw new UnauthorizedException({
        code: 'ACCOUNT_DISABLED',
        message: 'Account is disabled or does not exist',
      });
    }

    if (
      session.user.status === 'SUSPENDED' &&
      session.user.suspendedUntil &&
      session.user.suspendedUntil > new Date()
    ) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_SUSPENDED',
        message: `Account is suspended until ${session.user.suspendedUntil.toISOString()}`,
        suspendedUntil: session.user.suspendedUntil.toISOString(),
      });
    }

    return {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      displayName: session.user.displayName || session.user.username,
      bio: session.user.bio,
      avatarUrl: session.user.avatarUrl,
      coverUrl: session.user.coverUrl,
      website: session.user.website,
      locationCity: session.user.locationCity,
      isPrivate: session.user.isPrivate,
      isVerified: session.user.isVerified,
      isPremium: session.user.isPremium,
      followersCount: session.user.followersCount,
      followingCount: session.user.followingCount,
      role: session.user.role,
      status: session.user.status,
      createdAt: session.user.createdAt.toISOString(),
      sessionId: session.id,
    };
  }
}
