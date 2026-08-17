import { RequestIdMiddleware } from './request-id.middleware';
import { Request, Response } from 'express';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should generate a new request ID if none is supplied', () => {
    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    const generatedId = mockRequest.headers!['x-request-id'] as string;
    expect(generatedId).toBeDefined();
    expect(generatedId.length).toBeGreaterThan(10);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      generatedId,
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should preserve and propagate an existing incoming request ID', () => {
    mockRequest.headers = { 'x-request-id': 'custom-client-id-999' };

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest.headers['x-request-id']).toBe('custom-client-id-999');
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'custom-client-id-999',
    );
    expect(nextFunction).toHaveBeenCalled();
  });
});
