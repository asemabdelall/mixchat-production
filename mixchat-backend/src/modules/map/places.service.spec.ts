import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { PlacesService } from './places.service';

describe('PlacesService', () => {
  const redisClient = { set: jest.fn() };
  const redisGet = jest.fn();
  const redisSet = jest.fn();
  const redisDel = jest.fn();
  const redisService = {
    get: redisGet,
    set: redisSet,
    del: redisDel,
    getClient: jest.fn(() => redisClient),
  } as unknown as RedisService;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'geocoding.baseUrl') {
        return 'https://nominatim.openstreetmap.org';
      }
      if (key === 'geocoding.userAgent') {
        return 'MixChat tests (support@mixchat.app)';
      }
      if (key === 'frontendUrl') return 'https://mixchat.app';
      return undefined;
    }),
  } as unknown as ConfigService;

  let service: PlacesService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlacesService(configService, redisService);
    redisGet.mockResolvedValue(null);
    redisSet.mockResolvedValue(undefined);
    redisClient.set.mockResolvedValue('OK');
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('formats and caches a compact nearby place', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        name: 'Souq Sharq',
        address: {
          city: 'Kuwait City',
          state: 'Al Asimah',
          country: 'Kuwait',
        },
      }),
    });

    const result = await service.reverseGeocode({
      latitude: 29.3759,
      longitude: 47.9774,
      language: 'en-US',
    });

    expect(result.label).toBe('Souq Sharq, Kuwait City, Al Asimah, Kuwait');
    expect(result.attribution).toBe('© OpenStreetMap contributors');
    expect(redisSet).toHaveBeenCalledWith(
      expect.stringMatching(/^mixchat:geocoding:reverse:/),
      JSON.stringify(result),
      604800,
    );
  });

  it('uses the cached result without calling the provider', async () => {
    const cached = {
      label: 'Kuwait City, Kuwait',
      city: 'Kuwait City',
      region: null,
      country: 'Kuwait',
      provider: 'openstreetmap',
      attribution: '© OpenStreetMap contributors',
    };
    redisGet.mockResolvedValue(JSON.stringify(cached));
    global.fetch = jest.fn();

    await expect(
      service.reverseGeocode({ latitude: 29.37, longitude: 47.97 }),
    ).resolves.toEqual(cached);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('enforces the shared provider rate limit', async () => {
    redisClient.set.mockResolvedValue(null);

    await expect(
      service.reverseGeocode({ latitude: 29.37, longitude: 47.97 }),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
