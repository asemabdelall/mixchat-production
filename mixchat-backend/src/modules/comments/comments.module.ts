import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentsPolicyService } from './comments-policy.service';
import { MentionService } from './mention.service';
import { PostsModule } from '../posts/posts.module';
import { SocialModule } from '../social/social.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PostsModule, SocialModule, NotificationsModule],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsPolicyService, MentionService],
  exports: [CommentsService, CommentsPolicyService, MentionService],
})
export class CommentsModule {}
