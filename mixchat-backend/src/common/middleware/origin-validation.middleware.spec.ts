import type { NextFunction, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { OriginValidationMiddleware } from './origin-validation.middleware';

describe('OriginValidationMiddleware', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'frontendUrl') return 'https://mixchat.example';
      if (key === 'nodeEnv') return 'production';
      return undefined;
    }),
  } as unknown as ConfigService;
  const middleware = new OriginValidationMiddleware(config);

  function responseMock() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const getHeader = jest.fn().mockReturnValue('request-id');
    return {
      response: { status, getHeader } as unknown as Response,
      status,
      json,
    };
  }

  it('allows the configured production browser origin', () => {
    const next = jest.fn() as NextFunction;
    const { response, status } = responseMock();
    middleware.use(
      {
        method: 'POST',
        headers: { origin: 'https://mixchat.example' },
      } as unknown as Request,
      response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it('rejects a cross-site state-changing browser request', () => {
    const next = jest.fn() as NextFunction;
    const { response, status, json } = responseMock();
    middleware.use(
      {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      } as unknown as Request,
      response,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ORIGIN_NOT_ALLOWED' }),
    );
  });

  it('allows same-origin and native requests that omit Origin', () => {
    const next = jest.fn() as NextFunction;
    const { response } = responseMock();
    middleware.use(
      { method: 'POST', headers: {} } as unknown as Request,
      response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });
});
