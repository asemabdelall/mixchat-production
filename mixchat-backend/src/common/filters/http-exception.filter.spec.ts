import { HttpExceptionFilter, ApiErrorResponse } from './http-exception.filter';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: Partial<ArgumentsHost>;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
    mockRequest = {
      headers: { 'x-request-id': 'req-test-123' },
    };
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse as Response,
        getRequest: () => mockRequest as Request,
      }),
    };
  });

  it('should format HttpExceptions into standardized error envelope', () => {
    const exception = new HttpException(
      'Not found resource',
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    const calls = mockJson.mock.calls as [[ApiErrorResponse]];
    const sentBody = calls[0][0];
    expect(sentBody.error.code).toBe('NOT_FOUND');
    expect(sentBody.error.message).toBe('Not found resource');
    expect(sentBody.error.requestId).toBe('req-test-123');
  });

  it('should format validation errors with details array', () => {
    const exception = new BadRequestException({
      message: ['email must be an email', 'password is too short'],
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const calls = mockJson.mock.calls as [[ApiErrorResponse]];
    const sentBody = calls[0][0];
    expect(sentBody.error.code).toBe('VALIDATION_ERROR');
    expect(sentBody.error.message).toBe('Validation failed');
    expect(sentBody.error.details).toEqual([
      'email must be an email',
      'password is too short',
    ]);
  });

  it('should preserve a safe 413 response for oversized request bodies', () => {
    const exception = Object.assign(new Error('entity too large'), {
      status: HttpStatus.PAYLOAD_TOO_LARGE,
      type: 'entity.too.large',
    });

    filter.catch(exception, mockHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    const calls = mockJson.mock.calls as [[ApiErrorResponse]];
    expect(calls[0][0].error).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body exceeds the configured size limit',
    });
  });
});
