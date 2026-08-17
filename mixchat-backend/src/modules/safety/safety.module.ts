import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { AnonymousModule } from '../anonymous/anonymous.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { SafetyService } from './safety.service';
import { ReportsService } from './reports.service';
import { AdminModerationService } from './admin-moderation.service';
import { SafetyController } from './safety.controller';
import { ReportsController } from './reports.controller';
import { AdminModerationController } from './admin-moderation.controller';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [PrismaModule, RedisModule, AnonymousModule, RateLimitModule],
  controllers: [SafetyController, ReportsController, AdminModerationController],
  providers: [
    SafetyService,
    ReportsService,
    AdminModerationService,
    RolesGuard,
  ],
  exports: [SafetyService, ReportsService, AdminModerationService],
})
export class SafetyModule {}
