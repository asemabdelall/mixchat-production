import { Module, forwardRef } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialPolicyService } from './social-policy.service';
import { SocialController } from './social.controller';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [SocialController],
  providers: [SocialService, SocialPolicyService],
  exports: [SocialService, SocialPolicyService],
})
export class SocialModule {}
