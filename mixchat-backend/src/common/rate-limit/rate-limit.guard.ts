import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY } from './rate-limit.decorator';
import { RateLimitOptions, RateLimitService } from './rate-limit.service';
import { createHash } from 'crypto';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<
      RateLimitOptions | undefined
    >(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const credential =
      request.body?.identifier || request.body?.email || request.body?.username;
    const credentialHash =
      typeof credential === 'string' && credential.trim()
        ? createHash('sha256')
            .update(credential.trim().toLowerCase())
            .digest('hex')
            .slice(0, 16)
        : null;
    const ip = request.ip || 'anonymous';
    const userId =
      request.user?.id || (credentialHash ? `${ip}:${credentialHash}` : ip);

    await this.rateLimitService.checkRateLimit(userId, options, true);
    if (!request.user?.id && credentialHash) {
      await this.rateLimitService.checkRateLimit(
        ip,
        {
          action: `${options.action}_IP`,
          limit: Math.max(options.limit * 20, 100),
          windowSeconds: options.windowSeconds,
        },
        true,
      );
    }
    return true;
  }
}
