import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SocialModule } from '../social/social.module';
import { PostsModule } from '../posts/posts.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [SocialModule, PostsModule, MediaModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
