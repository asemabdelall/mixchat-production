import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationFilter } from './dto/notification.dto';

import { ChatGateway } from '../chat/realtime/chat.gateway';
import { WebPushService } from './web-push.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    notification: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    block: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  const mockChatGateway = {
    server: {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    },
  };

  const mockWebPushService = {
    sendPushToUser: jest.fn().mockResolvedValue({ sent: 0, failed: 0 }),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    registerSubscription: jest.fn(),
    revokeSubscription: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChatGateway, useValue: mockChatGateway },
        { provide: WebPushService, useValue: mockWebPushService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should suppress notification to oneself', async () => {
      const result = await service.createNotification({
        recipientId: 'user-1',
        actorId: 'user-1',
        type: NotificationType.LIKE_POST,
        entityId: 'post-1',
        entityType: 'POST',
      });
      expect(result).toBeNull();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should create new notification and return DTO', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.notification.count.mockResolvedValue(1);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        recipientId: 'user-2',
        actorId: 'user-1',
        type: NotificationType.FOLLOW,
        entityId: 'user-1',
        entityType: 'USER',
        readAt: null,
        metadata: null,
        createdAt: new Date(),
        actor: {
          id: 'user-1',
          username: 'actor',
          displayName: 'Actor User',
          avatarUrl: null,
          isVerified: false,
        },
      });

      const result = await service.createNotification({
        recipientId: 'user-2',
        actorId: 'user-1',
        type: NotificationType.FOLLOW,
        entityId: 'user-1',
        entityType: 'USER',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('notif-1');
      expect(result?.type).toBe(NotificationType.FOLLOW);
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });
  });

  describe('listNotifications', () => {
    it('should return paginated notifications with unread count', async () => {
      const now = new Date();
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          type: NotificationType.COMMENT_POST,
          entityId: 'post-1',
          entityType: 'POST',
          readAt: null,
          metadata: { previewText: 'Great post!' },
          createdAt: now,
          actor: {
            id: 'user-1',
            username: 'user1',
            displayName: 'User 1',
            avatarUrl: null,
            isVerified: true,
          },
        },
      ]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.listNotifications('user-2', {
        limit: 20,
        filter: NotificationFilter.ALL,
      });

      expect(result.items).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('markAsRead and markAllAsRead', () => {
    it('should mark single notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        recipientId: 'user-1',
        readAt: null,
      });
      mockPrisma.notification.update.mockResolvedValue({});
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await service.markAsRead('user-1', 'notif-1');
      expect(result.unreadCount).toBe(0);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { readAt: expect.any(Date) },
      });
    });

    it('should mark all notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');
      expect(result.unreadCount).toBe(0);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });
});
