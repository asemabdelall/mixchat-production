import { SetMetadata } from '@nestjs/common';
import type { RateLimitOptions } from './rate-limit.service';

export const RATE_LIMIT_KEY = 'mixchat_rate_limit';

export const RateLimit = (
  action: string,
  limit: number,
  windowSeconds: number,
) => {
  const options = {
    action,
    limit,
    windowSeconds,
  } satisfies RateLimitOptions;
  return SetMetadata(RATE_LIMIT_KEY, options);
};
