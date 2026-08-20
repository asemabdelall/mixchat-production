import { createHash } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/redis/redis.service';
import {
  PlaceSuggestionDto,
  ReverseGeocodeDto,
} from './dto/reverse-geocode.dto';

interface NominatimAddress {
  amenity?: string;
  tourism?: string;
  shop?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  region?: string;
  country?: string;
}

interface NominatimReverseResponse {
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
}

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private static readonly CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
  private static readonly RATE_LOCK_KEY = 'mixchat:geocoding:rate-lock';

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async reverseGeocode(dto: ReverseGeocodeDto): Promise<PlaceSuggestionDto> {
    const language = dto.language || 'en';
    const cacheKey = this.buildCacheKey(dto.latitude, dto.longitude, language);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as PlaceSuggestionDto;
      } catch {
        await this.redisService.del(cacheKey);
      }
    }

    await this.acquireProviderRateLock();

    const baseUrl =
      this.configService.get<string>('geocoding.baseUrl') ||
      'https://nominatim.openstreetmap.org';
    const url = new URL('/reverse', baseUrl);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '16');
    url.searchParams.set('lat', dto.latitude.toString());
    url.searchParams.set('lon', dto.longitude.toString());
    url.searchParams.set('accept-language', language);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent':
            this.configService.get<string>('geocoding.userAgent') ||
            'MixChat/1.0 (support@mixchat.app)',
          Referer:
            this.configService.get<string>('frontendUrl') ||
            'https://mixchat.app',
        },
      });

      if (!response.ok) {
        throw new Error(`Geocoding provider returned ${response.status}`);
      }

      const payload = (await response.json()) as NominatimReverseResponse;
      if (payload.error) throw new Error(payload.error);

      const result = this.toSuggestion(payload);
      await this.redisService.set(
        cacheKey,
        JSON.stringify(result),
        PlacesService.CACHE_TTL_SECONDS,
      );
      return result;
    } catch (error) {
      this.logger.warn(`Reverse geocoding failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException({
        code: 'PLACE_LOOKUP_UNAVAILABLE',
        message: 'Place lookup is temporarily unavailable',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async acquireProviderRateLock(): Promise<void> {
    try {
      const result = await this.redisService
        .getClient()
        .set(PlacesService.RATE_LOCK_KEY, '1', 'PX', 1100, 'NX');
      if (result !== 'OK') {
        throw new HttpException(
          {
            code: 'PLACE_LOOKUP_BUSY',
            message: 'Place lookup is busy. Please try again in a moment.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException({
        code: 'PLACE_LOOKUP_UNAVAILABLE',
        message: 'Place lookup is temporarily unavailable',
      });
    }
  }

  private buildCacheKey(
    latitude: number,
    longitude: number,
    language: string,
  ): string {
    const approximateCell = `${latitude.toFixed(3)}:${longitude.toFixed(3)}:${language.toLowerCase()}`;
    const digest = createHash('sha256').update(approximateCell).digest('hex');
    return `mixchat:geocoding:reverse:${digest}`;
  }

  private toSuggestion(payload: NominatimReverseResponse): PlaceSuggestionDto {
    const address = payload.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      null;
    const region = address.state || address.region || null;
    const country = address.country || null;
    const primary =
      payload.name ||
      address.amenity ||
      address.tourism ||
      address.shop ||
      address.road ||
      address.neighbourhood ||
      address.suburb ||
      city;
    const parts = [primary, city, region, country].filter(
      (part, index, all): part is string =>
        Boolean(part) && all.indexOf(part) === index,
    );
    const fallback = payload.display_name?.split(',').slice(0, 3).join(', ');
    const label = (parts.join(', ') || fallback || 'Current location').slice(
      0,
      100,
    );
    const alternatives = [
      [primary, city].filter(Boolean).join(', '),
      [city, region, country].filter(Boolean).join(', '),
      [region, country].filter(Boolean).join(', '),
      country || '',
    ]
      .filter(
        (value, index, all) =>
          Boolean(value) && value !== label && all.indexOf(value) === index,
      )
      .map((value) => value.slice(0, 100));

    return {
      label,
      city,
      region,
      country,
      provider: 'openstreetmap',
      attribution: '© OpenStreetMap contributors',
      alternatives: [label, ...alternatives].slice(0, 4),
    };
  }
}
