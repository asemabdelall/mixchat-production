import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, originalUrl, ip } = request;
    const requestId = (request.headers['x-request-id'] as string) || 'none';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logger.log(
            JSON.stringify({
              type: 'request',
              requestId,
              method,
              path: originalUrl,
              statusCode,
              durationMs: duration,
              clientIp: ip,
            }),
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.warn(
            JSON.stringify({
              type: 'request_error',
              requestId,
              method,
              path: originalUrl,
              errorName: error.name,
              errorMessage: error.message,
              durationMs: duration,
              clientIp: ip,
            }),
          );
        },
      }),
    );
  }
}
