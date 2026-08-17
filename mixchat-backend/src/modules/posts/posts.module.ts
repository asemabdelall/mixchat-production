import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostsPolicyService } from './posts-policy.service';
import { MediaModule } from '../media/media.module';
import { SocialModule } from '../social/social.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [MediaModule, SocialModule, NotificationsModule],
  controllers: [PostsController],
  providers: [PostsService, PostsPolicyService],
  exports: [PostsService, PostsPolicyService],
})
export class PostsModule {}
