import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SocialModule } from './modules/social/social.module';
import { MediaModule } from './modules/media/media.module';
import { PostsModule } from './modules/posts/posts.module';
import { CommentsModule } from './modules/comments/comments.module';
import { SearchModule } from './modules/search/search.module';
import { StoriesModule } from './modules/stories/stories.module';
import { ReelsModule } from './modules/reels/reels.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MapModule } from './modules/map/map.module';
import { AnonymousModule } from './modules/anonymous/anonymous.module';
import { SafetyModule } from './modules/safety/safety.module';
import { CallsModule } from './modules/calls/calls.module';
import { RateLimitModule } from './common/rate-limit/rate-limit.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { OriginValidationMiddleware } from './common/middleware/origin-validation.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    PrismaModule,
    RedisModule,
    RateLimitModule,
    HealthModule,
    AuthModule,
    UsersModule,
    SocialModule,
    MediaModule,
    PostsModule,
    CommentsModule,
    SearchModule,
    StoriesModule,
    ReelsModule,
    ChatModule,
    NotificationsModule,
    MapModule,
    AnonymousModule,
    SafetyModule,
    CallsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, OriginValidationMiddleware)
      .forRoutes('*');
  }
}
