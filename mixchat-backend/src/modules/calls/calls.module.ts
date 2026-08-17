import { Module, forwardRef } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { LiveKitService } from './livekit.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    RateLimitModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [CallsController],
  providers: [CallsService, LiveKitService],
  exports: [CallsService, LiveKitService],
})
export class CallsModule {}
