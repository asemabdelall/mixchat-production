import { Module, forwardRef } from '@nestjs/common';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';
import { ReelsPolicyService } from './reels-policy.service';
import { ReelsRankingService } from './reels-ranking.service';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [MediaModule, forwardRef(() => NotificationsModule)],
  controllers: [ReelsController],
  providers: [ReelsService, ReelsPolicyService, ReelsRankingService],
  exports: [ReelsService, ReelsPolicyService],
})
export class ReelsModule {}
