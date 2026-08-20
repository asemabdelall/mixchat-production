export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  frontendUrl: string;
  database: {
    url: string;
    poolMax: number;
    connectionTimeoutMs: number;
    statementTimeoutMs: number;
  };
  redis: {
    url: string;
  };
  swagger: {
    enabled: boolean;
  };
  jwt: {
    secret: string;
    accessExpiration: string;
    refreshExpirationDays: number;
  };
  cookie: {
    domain?: string;
    sameSite: 'lax' | 'strict' | 'none';
    secure: boolean;
  };
  http: {
    trustProxy: boolean;
    bodyLimitKb: number;
  };
  storage: {
    accountId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket: string;
    publicBaseUrl?: string;
    endpoint?: string;
  };
  media: {
    uploadUrlTtlSeconds: number;
    maxImageBytes: number;
    maxVideoBytes: number;
  };
  webPush: {
    publicKey?: string;
    privateKey?: string;
    subject: string;
  };
  livekit: {
    url: string;
    apiKey: string;
    apiSecret: string;
  };
  geocoding: {
    baseUrl: string;
    userAgent: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://mixchat:mixchat_dev_secret@localhost:5433/mixchat_db?schema=public',
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    connectionTimeoutMs: parseInt(
      process.env.DATABASE_CONNECTION_TIMEOUT_MS || '5000',
      10,
    ),
    statementTimeoutMs: parseInt(
      process.env.DATABASE_STATEMENT_TIMEOUT_MS || '15000',
      10,
    ),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6380',
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'mixchat_jwt_super_secret_development_key_32bytes_long',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpirationDays: parseInt(
      process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '7',
      10,
    ),
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    sameSite:
      (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') ||
      (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
    secure:
      process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production',
  },
  http: {
    trustProxy:
      process.env.TRUST_PROXY !== undefined
        ? process.env.TRUST_PROXY === 'true'
        : process.env.NODE_ENV === 'production',
    bodyLimitKb: parseInt(process.env.BODY_LIMIT_KB || '256', 10),
  },
  storage: {
    accountId: process.env.R2_ACCOUNT_ID || undefined,
    accessKeyId: process.env.R2_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || undefined,
    bucket: process.env.R2_BUCKET || 'mixchat-media',
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || undefined,
    endpoint:
      process.env.R2_ENDPOINT ||
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined),
  },
  media: {
    uploadUrlTtlSeconds: parseInt(
      process.env.MEDIA_UPLOAD_URL_TTL_SECONDS || '900',
      10,
    ),
    maxImageBytes: parseInt(
      process.env.MEDIA_MAX_IMAGE_BYTES || '10485760',
      10,
    ),
    maxVideoBytes: parseInt(
      process.env.MEDIA_MAX_VIDEO_BYTES || '104857600',
      10,
    ),
  },
  webPush: {
    publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY || undefined,
    privateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY || undefined,
    subject: process.env.WEB_PUSH_VAPID_SUBJECT || 'mailto:admin@mixchat.app',
  },
  livekit: {
    url: process.env.LIVEKIT_URL || 'wss://livekit.example.com',
    apiKey: process.env.LIVEKIT_API_KEY || 'devkey',
    apiSecret: process.env.LIVEKIT_API_SECRET || 'secret',
  },
  geocoding: {
    baseUrl:
      process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org',
    userAgent:
      process.env.GEOCODING_USER_AGENT || 'MixChat/1.0 (support@mixchat.app)',
  },
});
