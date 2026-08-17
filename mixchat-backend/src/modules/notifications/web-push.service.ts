import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  NotificationPreferencesDto,
  RegisterPushSubscriptionDto,
  UpdateNotificationPreferencesDto,
} from './dto/push-subscription.dto';
import { NotificationType } from '@prisma/client';
import * as webpush from 'web-push';

export interface WebPushPayload {
  notificationId: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url: string;
  tag?: string;
  data?: Record<string, any>;
}

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private vapidConfigured = false;
  private vapidPublicKey = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const subject =
      this.configService.get<string>('webPush.subject') ||
      'mailto:admin@mixchat.app';
    const publicKey = this.configService.get<string>('webPush.publicKey');
    const privateKey = this.configService.get<string>('webPush.privateKey');

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.vapidConfigured = true;
        this.vapidPublicKey = publicKey;
        this.logger.log('✅ WebPush VAPID details initialized successfully');
      } catch (err) {
        this.logger.error('Failed to configure WebPush VAPID details', err);
      }
    } else {
      this.logger.warn(
        '⚠️ WebPush VAPID keys are missing from configuration. Push notifications will be simulated in development.',
      );
    }
  }

  /**
   * Get the active VAPID application server public key
   */
  getVapidPublicKey(): { publicKey: string } {
    return { publicKey: this.vapidPublicKey };
  }

  /**
   * Get or create default user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    const prefs = await this.prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    if (prefs) {
      return {
        pushEnabled: prefs.pushEnabled,
        socialPush: prefs.socialPush,
        likesPush: prefs.likesPush,
        commentsPush: prefs.commentsPush,
        mentionsPush: prefs.mentionsPush,
        messagesPush: prefs.messagesPush,
        showMessagePreview: prefs.showMessagePreview,
      };
    }

    // Default settings if not existing
    return {
      pushEnabled: true,
      socialPush: true,
      likesPush: true,
      commentsPush: true,
      mentionsPush: true,
      messagesPush: true,
      showMessagePreview: true,
    };
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    const updated = await this.prisma.notificationPreferences.upsert({
      where: { userId },
      create: {
        userId,
        pushEnabled: dto.pushEnabled ?? true,
        socialPush: dto.socialPush ?? true,
        likesPush: dto.likesPush ?? true,
        commentsPush: dto.commentsPush ?? true,
        mentionsPush: dto.mentionsPush ?? true,
        messagesPush: dto.messagesPush ?? true,
        showMessagePreview: dto.showMessagePreview ?? true,
      },
      update: {
        ...(dto.pushEnabled !== undefined && { pushEnabled: dto.pushEnabled }),
        ...(dto.socialPush !== undefined && { socialPush: dto.socialPush }),
        ...(dto.likesPush !== undefined && { likesPush: dto.likesPush }),
        ...(dto.commentsPush !== undefined && {
          commentsPush: dto.commentsPush,
        }),
        ...(dto.mentionsPush !== undefined && {
          mentionsPush: dto.mentionsPush,
        }),
        ...(dto.messagesPush !== undefined && {
          messagesPush: dto.messagesPush,
        }),
        ...(dto.showMessagePreview !== undefined && {
          showMessagePreview: dto.showMessagePreview,
        }),
      },
    });

    return {
      pushEnabled: updated.pushEnabled,
      socialPush: updated.socialPush,
      likesPush: updated.likesPush,
      commentsPush: updated.commentsPush,
      mentionsPush: updated.mentionsPush,
      messagesPush: updated.messagesPush,
      showMessagePreview: updated.showMessagePreview,
    };
  }

  /**
   * Register or refresh browser PushSubscription
   */
  async registerSubscription(
    userId: string,
    dto: RegisterPushSubscriptionDto,
  ): Promise<{ success: boolean; id: string }> {
    if (!dto.endpoint || !dto.keys?.p256dh || !dto.keys?.auth) {
      throw new BadRequestException('Invalid PushSubscription payload');
    }

    // Limit maximum active subscriptions per user to 15 (pruning oldest if exceeded)
    const existingCount = await this.prisma.pushSubscription.count({
      where: { userId, revokedAt: null },
    });

    if (existingCount >= 15) {
      const oldest = await this.prisma.pushSubscription.findFirst({
        where: { userId, revokedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      if (oldest) {
        await this.prisma.pushSubscription.update({
          where: { id: oldest.id },
          data: { revokedAt: new Date() },
        });
      }
    }

    const sub = await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent || null,
        deviceLabel: dto.deviceLabel || null,
        lastUsedAt: new Date(),
        revokedAt: null,
      },
      update: {
        userId, // Account switch update: map to new user
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent || null,
        deviceLabel: dto.deviceLabel || null,
        lastUsedAt: new Date(),
        revokedAt: null,
      },
    });

    this.logger.log(
      `[push_subscription_registered] user=${userId} sub=${sub.id}`,
    );
    return { success: true, id: sub.id };
  }

  /**
   * Revoke/unregister specific browser PushSubscription
   */
  async revokeSubscription(
    userId: string,
    endpoint: string,
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing && existing.userId === userId) {
      await this.prisma.pushSubscription.delete({
        where: { id: existing.id },
      });
      this.logger.log(
        `[push_subscription_revoked] user=${userId} sub=${existing.id}`,
      );
    }

    return { success: true };
  }

  /**
   * Deliver Web Push to all active device subscriptions of a user
   * (Failure does NOT break caller)
   */
  async sendPushToUser(
    userId: string,
    payload: WebPushPayload,
    _context?: { conversationId?: string },
  ): Promise<void> {
    try {
      if (!this.vapidConfigured) {
        this.logger.debug(
          `[push_skipped] VAPID not configured. user=${userId} type=${payload.type}`,
        );
        return;
      }

      // Check User Preferences
      const prefs = await this.getPreferences(userId);
      if (!prefs.pushEnabled) {
        this.logger.debug(
          `[push_skipped] Push disabled by user preferences. user=${userId}`,
        );
        return;
      }

      // Check Category Preference
      const shouldSend = this.checkCategoryPreference(payload.type, prefs);
      if (!shouldSend) {
        this.logger.debug(
          `[push_skipped] Type ${payload.type} disabled by preferences for user=${userId}`,
        );
        return;
      }

      // Sanitize Message Previews if disabled
      const sanitizedPayload = { ...payload };
      if (
        payload.type === NotificationType.MESSAGE_NEW &&
        !prefs.showMessagePreview
      ) {
        sanitizedPayload.body = 'You have a new message';
      }

      // Find active subscriptions
      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: {
          userId,
          revokedAt: null,
        },
        take: 15,
      });

      if (subscriptions.length === 0) {
        return;
      }

      const stringifiedPayload = JSON.stringify({
        notificationId: sanitizedPayload.notificationId,
        type: sanitizedPayload.type,
        title: sanitizedPayload.title,
        body: sanitizedPayload.body,
        icon: sanitizedPayload.icon || '/mixchat-icon.png',
        badge: sanitizedPayload.badge || '/icons/icon-192.png',
        url: sanitizedPayload.url,
        tag: sanitizedPayload.tag || `notif:${sanitizedPayload.notificationId}`,
        data: sanitizedPayload.data || { url: sanitizedPayload.url },
      });

      const pushOptions: webpush.RequestOptions = {
        TTL: 24 * 60 * 60, // 24 hours
        urgency:
          payload.type === NotificationType.MESSAGE_NEW ? 'high' : 'normal',
      };

      const sendPromises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            stringifiedPayload,
            pushOptions,
          );

          await this.prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() },
          });

          this.logger.log(`[push_send_success] user=${userId} sub=${sub.id}`);
        } catch (err: any) {
          const statusCode = err?.statusCode || err?.status;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription has expired or been revoked by the browser push service
            this.logger.warn(
              `[push_subscription_expired] Removing dead endpoint sub=${sub.id} status=${statusCode}`,
            );
            await this.prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          } else {
            this.logger.warn(
              `[push_send_failure] Transient failure for sub=${sub.id}: ${err.message}`,
            );
          }
        }
      });

      await Promise.allSettled(sendPromises);
    } catch (err) {
      this.logger.error('Unexpected error in sendPushToUser', err);
    }
  }

  /**
   * Send a test push notification to user devices
   */
  async sendTestPushToUser(
    userId: string,
  ): Promise<{ success: boolean; delivered: number }> {
    if (!this.vapidConfigured) {
      return { success: false, delivered: 0 };
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId, revokedAt: null },
    });

    if (subscriptions.length === 0) {
      return { success: false, delivered: 0 };
    }

    const payload = {
      notificationId: `test-${Date.now()}`,
      type: NotificationType.MESSAGE_NEW,
      title: 'MixChat Web Push 🚀',
      body: 'Notifications are working perfectly on your device!',
      icon: '/mixchat-icon.png',
      badge: '/icons/icon-192.png',
      url: '/activity',
      tag: `test-${Date.now()}`,
      data: { url: '/activity' },
    };

    const stringifiedPayload = JSON.stringify(payload);
    let delivered = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          stringifiedPayload,
          { TTL: 60, urgency: 'high' },
        );
        delivered++;
      } catch (err: any) {
        this.logger.warn(`Failed test push to sub=${sub.id}: ${err.message}`);
      }
    }

    return { success: delivered > 0, delivered };
  }

  /**
   * Send high-urgency Incoming Call Web Push
   */
  async sendIncomingCallPush(
    userId: string,
    call: {
      id: string;
      type: 'VOICE' | 'VIDEO';
      callerName: string;
      callerAvatar?: string | null;
      conversationId: string;
    },
  ): Promise<void> {
    try {
      if (!this.vapidConfigured) return;

      const prefs = await this.getPreferences(userId);
      if (!prefs.pushEnabled || !prefs.messagesPush) return;

      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: { userId, revokedAt: null },
        take: 15,
      });

      if (subscriptions.length === 0) return;

      const stringifiedPayload = JSON.stringify({
        notificationId: `call-${call.id}`,
        type: 'INCOMING_CALL',
        title: `Incoming ${call.type === 'VIDEO' ? 'Video' : 'Voice'} Call 📞`,
        body: `${call.callerName} is calling you...`,
        icon: call.callerAvatar || '/mixchat-icon.png',
        badge: '/icons/icon-192.png',
        url: `/chat?callId=${call.id}`,
        tag: `call:${call.id}`,
        data: {
          callId: call.id,
          callType: call.type,
          conversationId: call.conversationId,
          url: `/chat?callId=${call.id}`,
        },
      });

      const pushOptions: webpush.RequestOptions = {
        TTL: 60, // Short TTL for incoming call alerts
        urgency: 'high',
      };

      const sendPromises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            stringifiedPayload,
            pushOptions,
          );
        } catch {
          // Ignore transient errors
        }
      });

      await Promise.allSettled(sendPromises);
    } catch (err) {
      this.logger.error('Error sending incoming call push', err);
    }
  }

  private checkCategoryPreference(
    type: NotificationType,
    prefs: NotificationPreferencesDto,
  ): boolean {
    switch (type) {
      case NotificationType.FOLLOW:
      case NotificationType.FOLLOW_REQUEST:
      case NotificationType.FOLLOW_ACCEPT:
        return prefs.socialPush;
      case NotificationType.LIKE_POST:
      case NotificationType.LIKE_COMMENT:
      case NotificationType.REPOST_POST:
      case NotificationType.REEL_LIKE:
        return prefs.likesPush;
      case NotificationType.COMMENT_POST:
      case NotificationType.REPLY_COMMENT:
      case NotificationType.REEL_COMMENT:
      case NotificationType.STORY_REPLY:
        return prefs.commentsPush;
      case NotificationType.MENTION_POST:
      case NotificationType.MENTION_COMMENT:
        return prefs.mentionsPush;
      case NotificationType.MESSAGE_NEW:
      case NotificationType.MISSED_CALL:
        return prefs.messagesPush;
      case NotificationType.STORY_REACTION:
        return prefs.likesPush;
      default:
        return true;
    }
  }
}
