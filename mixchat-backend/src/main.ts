import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RedisIoAdapter } from './infrastructure/adapters/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
    forceCloseConnections: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 4000;
  const apiPrefix = configService.get<string>('apiPrefix') ?? 'api';
  const frontendUrl =
    configService.get<string>('frontendUrl') ?? 'http://localhost:3000';
  const isSwaggerEnabled =
    configService.get<boolean>('swagger.enabled') ?? false;
  const isProduction = configService.get<string>('nodeEnv') === 'production';
  const bodyLimitKb = configService.get<number>('http.bodyLimitKb') ?? 256;
  const trustProxy = configService.get<boolean>('http.trustProxy') ?? false;
  const allowedOrigins = new Set([
    frontendUrl.replace(/\/$/, ''),
    ...(isProduction ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000']),
  ]);

  app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: isProduction ? undefined : false,
    }),
  );

  // Explicit request bounds prevent accidental large-body buffering. Media is
  // uploaded directly to object storage and never passes through this API.
  app.use(json({ limit: `${bodyLimitKb}kb` }));
  app.use(
    urlencoded({
      extended: false,
      limit: `${bodyLimitKb}kb`,
      parameterLimit: 100,
    }),
  );
  app.use(compression({ threshold: 1024 }));

  app.use(cookieParser());

  // Strict CORS with Credentials Support
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      const normalized = origin?.replace(/\/$/, '');
      callback(null, !normalized || allowedOrigins.has(normalized));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'x-request-id',
      'x-refresh-token',
    ],
    exposedHeaders: ['x-request-id'],
  });

  // Global Prefix
  app.setGlobalPrefix(apiPrefix);

  // Enable URI Versioning (e.g. /api/v1/...)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Redis Socket.IO Adapter for horizontal multi-instance scaling
  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Graceful Shutdown
  app.enableShutdownHooks();

  // Swagger / OpenAPI Specification
  if (isSwaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MixChat API')
      .setDescription(
        'MixChat Full-Stack Production API Documentation & Contracts',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT Access Token',
        },
        'access-token',
      )
      .addTag(
        'Health & Monitoring',
        'Endpoints for container health and readiness probes',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: !isProduction,
      },
      jsonDocumentUrl: `${apiPrefix}/docs-json`,
    });

    logger.log(
      `Swagger Docs available at: http://localhost:${port}/${apiPrefix}/docs`,
    );
    logger.log(
      `OpenAPI JSON spec at: http://localhost:${port}/${apiPrefix}/docs-json`,
    );
  }

  await app.listen(port, '0.0.0.0');
  logger.log(
    `🚀 MixChat Backend running on port ${port} with prefix /${apiPrefix}`,
  );
}

void bootstrap();
