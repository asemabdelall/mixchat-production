import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { SocialModule } from '../social/social.module';
import { MediaModule } from '../media/media.module';
import { AnonymousMatchmakingStore } from './anonymous-matchmaking.store';
import { AnonymousMatchmakingService } from './anonymous-matchmaking.service';
import { AnonymousSessionService } from './anonymous-session.service';
import { AnonymousGateway } from './anonymous.gateway';
import { AnonymousController } from './anonymous.controller';

@Module({
  imports: [PrismaModule, RedisModule, SocialModule, MediaModule],
  controllers: [AnonymousController],
  providers: [
    AnonymousMatchmakingStore,
    AnonymousMatchmakingService,
    AnonymousSessionService,
    AnonymousGateway,
  ],
  exports: [
    AnonymousMatchmakingStore,
    AnonymousMatchmakingService,
    AnonymousSessionService,
    AnonymousGateway,
  ],
})
export class AnonymousModule {}
