import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';

export interface DatabaseQueryMeasurement {
  count: number;
  totalDurationMs: number;
  slowQueries: Array<{ durationMs: number; fingerprint: string }>;
  duplicateFingerprints: Record<string, number>;
}

interface MutableDatabaseQueryMeasurement extends DatabaseQueryMeasurement {
  fingerprints: Map<string, number>;
}

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly queryMeasurements =
    new AsyncLocalStorage<MutableDatabaseQueryMeasurement>();
  private readonly queryMetricsEnabled: boolean;

  constructor(configService: ConfigService) {
    const connectionString =
      configService.get<string>('database.url') ||
      process.env.DATABASE_URL ||
      'postgresql://mixchat:mixchat_dev_secret@localhost:5432/mixchat_db?schema=public';
    const adapter = new PrismaPg({
      connectionString,
      max: configService.get<number>('database.poolMax') ?? 10,
      connectionTimeoutMillis:
        configService.get<number>('database.connectionTimeoutMs') ?? 5000,
      statement_timeout:
        configService.get<number>('database.statementTimeoutMs') ?? 15000,
      application_name: 'mixchat-api',
    });
    const queryMetricsEnabled =
      process.env.PRISMA_QUERY_METRICS === 'true' &&
      process.env.NODE_ENV !== 'production';
    super({
      adapter,
      log: queryMetricsEnabled ? [{ emit: 'event', level: 'query' }] : [],
    });
    this.queryMetricsEnabled = queryMetricsEnabled;
    this.$on('query', (event) => this.recordQuery(event));
  }

  private recordQuery(event: Prisma.QueryEvent): void {
    const measurement = this.queryMeasurements.getStore();
    if (!measurement) return;

    const normalized = event.query.replace(/\s+/g, ' ').trim();
    const fingerprint = createHash('sha256')
      .update(normalized)
      .digest('hex')
      .slice(0, 12);
    measurement.count += 1;
    measurement.totalDurationMs += event.duration;
    measurement.fingerprints.set(
      fingerprint,
      (measurement.fingerprints.get(fingerprint) ?? 0) + 1,
    );
    if (event.duration >= 25) {
      measurement.slowQueries.push({
        durationMs: Number(event.duration.toFixed(3)),
        fingerprint,
      });
    }
  }

  async measureQueries<T>(operation: () => Promise<T>): Promise<{
    result: T;
    measurement: DatabaseQueryMeasurement;
  }> {
    if (!this.queryMetricsEnabled) {
      throw new Error(
        'Query metrics are disabled. Set PRISMA_QUERY_METRICS=true outside production.',
      );
    }

    const state: MutableDatabaseQueryMeasurement = {
      count: 0,
      totalDurationMs: 0,
      slowQueries: [],
      duplicateFingerprints: {},
      fingerprints: new Map<string, number>(),
    };

    const result = await this.queryMeasurements.run(state, operation);
    state.duplicateFingerprints = Object.fromEntries(
      [...state.fingerprints.entries()].filter(([, count]) => count > 1),
    );
    return {
      result,
      measurement: {
        count: state.count,
        totalDurationMs: Number(state.totalDurationMs.toFixed(3)),
        slowQueries: state.slowQueries,
        duplicateFingerprints: state.duplicateFingerprints,
      },
    };
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully via Prisma');
    } catch (error) {
      this.logger.warn(
        `Database connection deferred or pending: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected gracefully');
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
