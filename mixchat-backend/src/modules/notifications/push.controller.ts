import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WebPushService } from './web-push.service';
import {
  RegisterPushSubscriptionDto,
  UnregisterPushSubscriptionDto,
  VapidPublicKeyResponseDto,
} from './dto/push-subscription.dto';

@ApiTags('Web Push Notifications')
@Controller({ path: 'push', version: '1' })
export class PushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for WebPush subscription' })
  @ApiOkResponse({ type: VapidPublicKeyResponseDto })
  getVapidPublicKey(): VapidPublicKeyResponseDto {
    return this.webPushService.getVapidPublicKey();
  }

  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a browser PushSubscription' })
  @HttpCode(HttpStatus.OK)
  async registerSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterPushSubscriptionDto,
  ): Promise<{ success: boolean; id: string }> {
    return this.webPushService.registerSubscription(userId, dto);
  }

  @Delete('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a browser PushSubscription' })
  @HttpCode(HttpStatus.OK)
  async revokeSubscription(
    @CurrentUser('id') userId: string,
    @Body() dto: UnregisterPushSubscriptionDto,
  ): Promise<{ success: boolean }> {
    return this.webPushService.revokeSubscription(userId, dto.endpoint);
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send a test push notification to the current user',
  })
  @HttpCode(HttpStatus.OK)
  async sendTestPush(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; delivered: number }> {
    return this.webPushService.sendTestPushToUser(userId);
  }
}
