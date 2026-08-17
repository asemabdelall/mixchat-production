import { Module, forwardRef } from '@nestjs/common';
import { MapController } from './map.controller';
import { MapService } from './map.service';
import { LocationVisibilityPolicy } from './location-visibility.policy';
import { SocialModule } from '../social/social.module';
import { ChatModule } from '../chat/chat.module';
import { StoriesModule } from '../stories/stories.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    SocialModule,
    StoriesModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [MapController],
  providers: [MapService, LocationVisibilityPolicy],
  exports: [MapService, LocationVisibilityPolicy],
})
export class MapModule {}
