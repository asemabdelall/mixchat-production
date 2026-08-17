import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { StoriesPolicyService } from './stories-policy.service';
import { StoriesScheduler } from './stories.scheduler';
import { MediaModule } from '../media/media.module';
import { SocialModule } from '../social/social.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MediaModule,
    SocialModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [StoriesController],
  providers: [StoriesService, StoriesPolicyService, StoriesScheduler],
  exports: [StoriesService, StoriesPolicyService],
})
export class StoriesModule {}
