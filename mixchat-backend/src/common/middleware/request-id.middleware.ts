import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const existingId =
      req.headers['x-request-id'] || req.headers['x-correlation-id'];
    const normalizedId =
      typeof existingId === 'string' ? existingId.trim() : '';
    const requestId =
      normalizedId.length > 0 &&
      normalizedId.length <= 128 &&
      /^[a-zA-Z0-9._:-]+$/.test(normalizedId)
        ? normalizedId
        : randomUUID();

    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    next();
  }
}
