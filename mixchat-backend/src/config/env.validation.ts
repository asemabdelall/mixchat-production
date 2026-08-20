import * as Joi from 'joi';

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_PREFIX: string;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  DATABASE_POOL_MAX: number;
  DATABASE_CONNECTION_TIMEOUT_MS: number;
  DATABASE_STATEMENT_TIMEOUT_MS: number;
  REDIS_URL: string;
  SWAGGER_ENABLED: boolean;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRATION: string;
  REFRESH_TOKEN_EXPIRATION_DAYS: number;
  COOKIE_DOMAIN?: string;
  COOKIE_SAME_SITE: 'lax' | 'strict' | 'none';
  COOKIE_SECURE?: boolean;
  TRUST_PROXY: boolean;
  BODY_LIMIT_KB: number;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
  R2_PUBLIC_BASE_URL?: string;
  R2_ENDPOINT?: string;
  MEDIA_UPLOAD_URL_TTL_SECONDS?: number;
  MEDIA_MAX_IMAGE_BYTES?: number;
  MEDIA_MAX_VIDEO_BYTES?: number;
  WEB_PUSH_VAPID_PUBLIC_KEY?: string;
  WEB_PUSH_VAPID_PRIVATE_KEY?: string;
  WEB_PUSH_VAPID_SUBJECT?: string;
  LIVEKIT_URL?: string;
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  GEOCODING_BASE_URL?: string;
  GEOCODING_USER_AGENT?: string;
}

export const envValidationSchema = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  API_PREFIX: Joi.string().default('api'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  DATABASE_URL: Joi.string().required().messages({
    'any.required': 'DATABASE_URL is required for database connectivity',
  }),
  DATABASE_POOL_MAX: Joi.number().integer().min(1).max(100).default(10),
  DATABASE_CONNECTION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(500)
    .max(30000)
    .default(5000),
  DATABASE_STATEMENT_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(120000)
    .default(15000),
  REDIS_URL: Joi.string().required().messages({
    'any.required': 'REDIS_URL is required for Redis connectivity',
  }),
  SWAGGER_ENABLED: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().default(false),
    otherwise: Joi.boolean().default(true),
  }),
  JWT_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(32)
      .invalid('mixchat_jwt_super_secret_development_key_32bytes_long')
      .required(),
    otherwise: Joi.string().default(
      'mixchat_jwt_super_secret_development_key_32bytes_long',
    ),
  }).messages({
    'any.required': 'JWT_SECRET is required for session security',
  }),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION_DAYS: Joi.number().min(1).default(7),
  COOKIE_DOMAIN: Joi.string().optional(),
  COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  COOKIE_SECURE: Joi.boolean().optional(),
  TRUST_PROXY: Joi.boolean().default(false),
  BODY_LIMIT_KB: Joi.number().integer().min(16).max(1024).default(256),
  R2_ACCOUNT_ID: Joi.string().optional(),
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_BUCKET: Joi.string().default('mixchat-media'),
  R2_PUBLIC_BASE_URL: Joi.string().uri().optional(),
  R2_ENDPOINT: Joi.string().uri().optional(),
  MEDIA_UPLOAD_URL_TTL_SECONDS: Joi.number().min(60).max(3600).default(900),
  MEDIA_MAX_IMAGE_BYTES: Joi.number()
    .min(1024)
    .default(10 * 1024 * 1024), // 10MB
  MEDIA_MAX_VIDEO_BYTES: Joi.number()
    .min(1024)
    .default(100 * 1024 * 1024), // 100MB
  WEB_PUSH_VAPID_PUBLIC_KEY: Joi.string().optional(),
  WEB_PUSH_VAPID_PRIVATE_KEY: Joi.string().optional(),
  WEB_PUSH_VAPID_SUBJECT: Joi.string()
    .optional()
    .default('mailto:admin@mixchat.app'),
  LIVEKIT_URL: Joi.string().optional().default('wss://livekit.example.com'),
  LIVEKIT_API_KEY: Joi.string().optional().default('devkey'),
  LIVEKIT_API_SECRET: Joi.string().optional().default('secret'),
  GEOCODING_BASE_URL: Joi.string()
    .uri()
    .optional()
    .default('https://nominatim.openstreetmap.org'),
  GEOCODING_USER_AGENT: Joi.string()
    .min(10)
    .optional()
    .default('MixChat/1.0 (support@mixchat.app)'),
});
