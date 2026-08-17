import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { SocialModule } from '../social/social.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './realtime/chat.gateway';
import { PresenceService } from './realtime/presence.service';
import { TypingService } from './realtime/typing.service';

@Module({
  imports: [
    AuthModule,
    MediaModule,
    forwardRef(() => SocialModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, PresenceService, TypingService],
  exports: [ChatService, ChatGateway, PresenceService, TypingService],
})
export class ChatModule {}
