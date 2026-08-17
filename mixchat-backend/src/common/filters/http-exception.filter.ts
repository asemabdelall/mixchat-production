import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
    timestamp: string;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  private readonly statusErrorMap: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CONFLICT',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
    [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
    [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  };

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request.headers['x-request-id'] as string) || 'unknown-request-id';
    const timestamp = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An internal server error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        code = this.statusToErrorCode(status);
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) || exception.message;
        code =
          (obj.error as string)?.toUpperCase().replace(/\s+/g, '_') ||
          this.statusToErrorCode(status);

        if (Array.isArray(obj.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = obj.message;
        } else if (obj.details) {
          details = obj.details;
        }
      }
    } else if (exception instanceof Error) {
      const errorStatus = (exception as Error & { status?: number }).status;
      if (errorStatus === HttpStatus.PAYLOAD_TOO_LARGE) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        code = 'PAYLOAD_TOO_LARGE';
        message = 'Request body exceeds the configured size limit';
      } else {
        this.logger.error(
          `[${requestId}] Unhandled Exception: ${exception.message}`,
          exception.stack,
        );
        if (process.env.NODE_ENV === 'development') {
          message = exception.message;
        }
      }
    }

    const errorBody: ApiErrorResponse = {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
        requestId,
        timestamp,
      },
    };

    response.status(status).json(errorBody);
  }

  private statusToErrorCode(status: number): string {
    return this.statusErrorMap[status] ?? 'INTERNAL_SERVER_ERROR';
  }
}
