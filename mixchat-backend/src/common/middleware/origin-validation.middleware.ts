import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class OriginValidationMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }

    const origin = req.headers.origin;
    if (!origin) {
      // Native clients and server-to-server requests generally omit Origin.
      next();
      return;
    }

    const configuredOrigin = this.config
      .get<string>('frontendUrl')
      ?.replace(/\/$/, '');
    const isProduction = this.config.get<string>('nodeEnv') === 'production';
    const allowedOrigins = new Set(
      [
        configuredOrigin,
        ...(isProduction
          ? []
          : ['http://localhost:3000', 'http://127.0.0.1:3000']),
      ].filter((value): value is string => Boolean(value)),
    );

    if (!allowedOrigins.has(origin.replace(/\/$/, ''))) {
      res.status(403).json({
        statusCode: 403,
        code: 'ORIGIN_NOT_ALLOWED',
        message: 'Request origin is not allowed',
        requestId: res.getHeader('x-request-id'),
      });
      return;
    }

    next();
  }
}
