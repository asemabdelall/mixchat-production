import {
  Controller,
  Get,
  HttpStatus,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import {
  LivenessResponseDto,
  ReadinessResponseDto,
} from './dto/health-response.dto';

@ApiTags('Health & Monitoring')
@Controller({ path: 'health', version: [VERSION_NEUTRAL, '1'] })
export class HealthController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness probe to confirm backend process is running',
  })
  @ApiResponse({
    status: 200,
    type: LivenessResponseDto,
    description: 'Process is alive',
  })
  getLiveness(): LivenessResponseDto {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe validating database and Redis connectivity',
  })
  @ApiResponse({
    status: 200,
    type: ReadinessResponseDto,
    description:
      'All core dependencies are healthy and ready to accept traffic',
  })
  @ApiResponse({
    status: 503,
    type: ReadinessResponseDto,
    description: 'One or more core dependencies are degraded or unreachable',
  })
  async getReadiness(
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReadinessResponseDto> {
    const [dbHealthy, redisHealthy] = await Promise.all([
      this.prismaService.isHealthy(),
      this.redisService.isHealthy(),
    ]);

    const isAllHealthy = dbHealthy && redisHealthy;
    const statusCode = isAllHealthy
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(statusCode);

    return {
      status: isAllHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealthy,
        redis: redisHealthy,
      },
    };
  }
}
