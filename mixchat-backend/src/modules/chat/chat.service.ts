import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  ConversationParticipantRole,
  ConversationType,
  MediaKind,
  MediaStatus,
  MessageType,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MediaService } from '../media/media.service';
import { SocialPolicyService } from '../social/social-policy.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ChatPageQueryDto,
  CreateConversationDto,
  GroupMemberDto,
  MarkConversationReadDto,
  SendMessageDto,
  UpdateConversationStateDto,
  UpdateGroupDto,
  UpdateMessageDto,
} from './dto/chat-request.dto';
import {
  ConversationSummaryDto,
  MessageResponseDto,
  PaginatedConversationsDto,
  PaginatedMessagesDto,
  ReadStateDto,
} from './dto/chat-response.dto';

type Cursor = { createdAt: string; id: string };

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isVerified: true,
  isPremium: true,
} satisfies Prisma.UserSelect;

const messageInclude = {
  sender: { select: userSelect },
  attachments: {
    orderBy: { position: 'asc' as const },
    include: { mediaObject: true },
  },
  replyToMessage: { include: { sender: { select: { displayName: true } } } },
} satisfies Prisma.MessageInclude;

type MessageRecord = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

const conversationInclude = {
  avatarMedia: true,
  participants: {
    where: { leftAt: null },
    include: { user: { select: userSelect } },
  },
  lastMessage: { include: messageInclude },
} satisfies Prisma.ConversationInclude;

type ConversationRecord = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly socialPolicy: SocialPolicyService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(
      JSON.stringify({ createdAt: createdAt.toISOString(), id }),
    ).toString('base64url');
  }

  private decodeCursor(value?: string): Cursor | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as Cursor;
      if (
        !parsed.id ||
        !parsed.createdAt ||
        isNaN(Date.parse(parsed.createdAt))
      ) {
        throw new Error('invalid');
      }
      return parsed;
    } catch {
      throw new BadRequestException({
        code: 'CHAT_CURSOR_INVALID',
        message: 'Invalid pagination cursor',
      });
    }
  }

  async assertMembership(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: { conversation: true },
    });
    if (!participant || participant.leftAt) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation does not exist',
      });
    }
    return participant;
  }

  private async assertCanStartDirect(actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw new BadRequestException({
        code: 'CHAT_SELF_CONVERSATION',
        message: 'A direct conversation requires another user',
      });
    }
    await this.socialPolicy.assertCanInteract(actorId, targetId);
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        privacySettings: { select: { allowDirectMessages: true } },
      },
    });
    if (!target) throw new NotFoundException('User not found');
    const policy = target.privacySettings?.allowDirectMessages ?? 'Everyone';
    if (policy === 'Nobody') {
      throw new ForbiddenException({
        code: 'DIRECT_MESSAGES_DISABLED',
        message: 'This user does not accept direct messages',
      });
    }
    if (policy === 'Following') {
      const followsActor = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetId,
            followingId: actorId,
          },
        },
      });
      if (!followsActor) {
        throw new ForbiddenException({
          code: 'DIRECT_MESSAGES_FOLLOWING_ONLY',
          message: 'This user only accepts messages from people they follow',
        });
      }
    }
  }

  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationSummaryDto> {
    if (dto.type === ConversationType.DIRECT) {
      if (!dto.targetUserId)
        throw new BadRequestException('targetUserId is required');
      await this.assertCanStartDirect(userId, dto.targetUserId);
      const directKey = [userId, dto.targetUserId].sort().join(':');
      let conversation: ConversationRecord;
      try {
        conversation = await this.prisma.conversation.create({
          data: {
            type: ConversationType.DIRECT,
            directKey,
            creatorId: userId,
            participants: {
              create: [
                { userId, role: ConversationParticipantRole.MEMBER },
                {
                  userId: dto.targetUserId,
                  role: ConversationParticipantRole.MEMBER,
                },
              ],
            },
          },
          include: conversationInclude,
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2002'
        ) {
          throw error;
        }
        const existing = await this.prisma.conversation.findUnique({
          where: { directKey },
          include: conversationInclude,
        });
        if (!existing) throw error;
        conversation = existing;
      }
      return this.toConversationDto(conversation, userId);
    }

    const memberIds = [...new Set(dto.memberIds ?? [])].filter(
      (id) => id !== userId,
    );
    if (!dto.title?.trim() || memberIds.length < 1) {
      throw new BadRequestException({
        code: 'GROUP_INVALID',
        message: 'A group needs a title and at least one other member',
      });
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
    });
    if (users.length !== memberIds.length)
      throw new NotFoundException('One or more users not found');
    for (const memberId of memberIds) {
      const block = await this.socialPolicy.isBlockedEitherDirection(
        userId,
        memberId,
      );
      if (block.isBlocked)
        throw new ForbiddenException('A blocked user cannot join the group');
    }
    if (dto.avatarMediaObjectId) {
      await this.assertOwnedReadyMedia(
        userId,
        [dto.avatarMediaObjectId],
        MediaKind.IMAGE,
      );
    }
    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        title: dto.title.trim(),
        creatorId: userId,
        avatarMediaId: dto.avatarMediaObjectId,
        participants: {
          create: [
            { userId, role: ConversationParticipantRole.OWNER },
            ...memberIds.map((id) => ({
              userId: id,
              role: ConversationParticipantRole.MEMBER,
            })),
          ],
        },
      },
      include: conversationInclude,
    });
    return this.toConversationDto(conversation, userId);
  }

  async listConversations(
    userId: string,
    query: ChatPageQueryDto,
  ): Promise<PaginatedConversationsDto> {
    const cursor = this.decodeCursor(query.cursor);
    const limit = query.limit ?? 30;
    const rows = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
            leftAt: null,
            archivedAt: query.archived ? { not: null } : null,
          },
        },
        ...(cursor
          ? {
              OR: [
                { lastMessageAt: { lt: new Date(cursor.createdAt) } },
                {
                  lastMessageAt: new Date(cursor.createdAt),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: conversationInclude,
    });
    const hasNextPage = rows.length > limit;
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      items: await Promise.all(
        page.map((row) => this.toConversationDto(row, userId)),
      ),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last?.lastMessageAt
            ? this.encodeCursor(last.lastMessageAt, last.id)
            : null,
      },
    };
  }

  async getConversation(userId: string, conversationId: string) {
    await this.assertMembership(userId, conversationId);
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.toConversationDto(conversation, userId);
  }

  async listMessages(
    userId: string,
    conversationId: string,
    query: ChatPageQueryDto,
  ): Promise<PaginatedMessagesDto> {
    await this.assertMembership(userId, conversationId);
    const cursor = this.decodeCursor(query.cursor);
    const limit = query.limit ?? 30;
    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                {
                  createdAt: new Date(cursor.createdAt),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: messageInclude,
    });
    const hasNextPage = rows.length > limit;
    const page = rows.slice(0, limit);
    const oldest = page.at(-1);
    const items = await Promise.all(
      page.reverse().map((row) => this.toMessageDto(row)),
    );
    return {
      items,
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && oldest
            ? this.encodeCursor(oldest.createdAt, oldest.id)
            : null,
      },
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const participant = await this.assertMembership(userId, conversationId);
    if (participant.conversation.type === ConversationType.DIRECT) {
      const other = await this.prisma.conversationParticipant.findFirst({
        where: { conversationId, userId: { not: userId }, leftAt: null },
        select: { userId: true },
      });
      if (!other)
        throw new ConflictException(
          'Direct conversation participant is unavailable',
        );
      const blocked = await this.socialPolicy.isBlockedEitherDirection(
        userId,
        other.userId,
      );
      if (blocked.isBlocked)
        throw new ForbiddenException('Cannot message a blocked user');
    }
    const existing = await this.prisma.message.findUnique({
      where: {
        conversationId_senderId_clientMessageId: {
          conversationId,
          senderId: userId,
          clientMessageId: dto.clientMessageId,
        },
      },
      include: messageInclude,
    });
    if (existing) return this.toMessageDto(existing);
    await this.validateMessagePayload(userId, conversationId, dto);

    try {
      const message = await this.prisma.$transaction(async (tx) => {
        // Serialize state mutations per conversation. This keeps participant
        // counter lock ordering stable and prevents group-send deadlocks while
        // still allowing unrelated conversations to write concurrently.
        await tx.$queryRaw`
          SELECT id FROM conversations WHERE id = ${conversationId} FOR UPDATE
        `;
        const created = await tx.message.create({
          data: {
            conversationId,
            senderId: userId,
            type: dto.type,
            text: dto.text?.trim() || null,
            clientMessageId: dto.clientMessageId,
            replyToMessageId: dto.replyToMessageId,
            durationMs: dto.durationMs,
            waveform: dto.waveform,
            attachments: dto.mediaObjectIds?.length
              ? {
                  create: dto.mediaObjectIds.map((mediaObjectId, position) => ({
                    mediaObjectId,
                    position,
                  })),
                }
              : undefined,
          },
          include: messageInclude,
        });
        await tx.$executeRaw`
          UPDATE conversations
          SET last_message_id = ${created.id}, last_message_at = ${created.createdAt}, updated_at = NOW()
          WHERE id = ${conversationId}
            AND (
              last_message_at IS NULL
              OR last_message_at < ${created.createdAt}
              OR (last_message_at = ${created.createdAt} AND COALESCE(last_message_id::text, '') < ${created.id})
            )
        `;
        await tx.conversationParticipant.updateMany({
          where: { conversationId, userId: { not: userId }, leftAt: null },
          data: { unreadCount: { increment: 1 }, archivedAt: null },
        });
        return created;
      });

      // Deliver notifications to other participants
      if (this.notificationsService) {
        const otherParticipants =
          await this.prisma.conversationParticipant.findMany({
            where: { conversationId, userId: { not: userId }, leftAt: null },
            select: { userId: true },
          });

        const previewText =
          dto.text?.slice(0, 80) ||
          (dto.type === MessageType.VOICE
            ? '🎤 Voice message'
            : dto.mediaObjectIds?.length
              ? '📷 Media attachment'
              : 'Sent a message');

        this.logger.log(
          `[message_notification] conv=${conversationId} sender=${userId} recipients=${otherParticipants.length}`,
        );

        await Promise.allSettled(
          otherParticipants.map((p) =>
            this.notificationsService.createNotification({
              recipientId: p.userId,
              actorId: userId,
              type: NotificationType.MESSAGE_NEW,
              entityId: conversationId,
              entityType: 'CONVERSATION',
              metadata: {
                previewText,
                messageId: message.id,
              },
            }),
          ),
        );
      }

      return this.toMessageDto(message);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const recovered = await this.prisma.message.findUnique({
          where: {
            conversationId_senderId_clientMessageId: {
              conversationId,
              senderId: userId,
              clientMessageId: dto.clientMessageId,
            },
          },
          include: messageInclude,
        });
        if (recovered) return this.toMessageDto(recovered);
      }
      throw error;
    }
  }

  private async validateMessagePayload(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    if (dto.type === MessageType.SYSTEM)
      throw new ForbiddenException('System messages are server-only');
    const mediaIds = dto.mediaObjectIds ?? [];
    if (dto.type === MessageType.TEXT) {
      if (!dto.text?.trim() || mediaIds.length)
        throw new BadRequestException('Text messages require text only');
    } else {
      if (!mediaIds.length)
        throw new BadRequestException(
          'This message type requires an attachment',
        );
      const expected: Record<string, MediaKind> = {
        IMAGE: MediaKind.IMAGE,
        VIDEO: MediaKind.VIDEO,
        FILE: MediaKind.FILE,
        VOICE: MediaKind.AUDIO,
      };
      const media = await this.assertOwnedReadyMedia(
        userId,
        mediaIds,
        expected[dto.type],
      );
      if (dto.type === MessageType.VOICE) {
        if (mediaIds.length !== 1 || !dto.durationMs)
          throw new BadRequestException(
            'Voice messages need one audio file and duration',
          );
        const storedDuration = media[0].durationMs;
        if (
          storedDuration &&
          Math.abs(storedDuration - dto.durationMs) > 2000
        ) {
          throw new BadRequestException(
            'Voice duration does not match uploaded media',
          );
        }
      }
    }
    if (dto.replyToMessageId) {
      const reply = await this.prisma.message.findUnique({
        where: { id: dto.replyToMessageId },
      });
      if (!reply || reply.conversationId !== conversationId) {
        throw new BadRequestException(
          'Reply target must belong to this conversation',
        );
      }
    }
  }

  private async assertOwnedReadyMedia(
    userId: string,
    ids: string[],
    kind: MediaKind,
  ) {
    const media = await this.prisma.mediaObject.findMany({
      where: { id: { in: ids } },
    });
    if (
      media.length !== ids.length ||
      media.some(
        (item) =>
          item.ownerId !== userId ||
          item.status !== MediaStatus.READY ||
          item.kind !== kind,
      )
    ) {
      throw new BadRequestException({
        code: 'CHAT_ATTACHMENT_INVALID',
        message:
          'Every attachment must be owned, ready, and match the message type',
      });
    }
    return media;
  }

  async markRead(
    userId: string,
    conversationId: string,
    dto: MarkConversationReadDto,
  ): Promise<ReadStateDto> {
    const participant = await this.assertMembership(userId, conversationId);
    const target = await this.prisma.message.findUnique({
      where: { id: dto.lastReadMessageId },
    });
    if (!target || target.conversationId !== conversationId)
      throw new BadRequestException('Read target is not in this conversation');
    const current = participant.lastReadMessageId
      ? await this.prisma.message.findUnique({
          where: { id: participant.lastReadMessageId },
        })
      : null;
    if (
      current &&
      (current.createdAt > target.createdAt ||
        (current.createdAt.getTime() === target.createdAt.getTime() &&
          current.id >= target.id))
    ) {
      return {
        conversationId,
        lastReadMessageId: current.id,
        lastReadAt: (participant.lastReadAt ?? current.createdAt).toISOString(),
        unreadCount: participant.unreadCount,
      };
    }
    const newlyRead = await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        ...(current
          ? {
              OR: [
                { createdAt: { gt: current.createdAt, lt: target.createdAt } },
                { createdAt: target.createdAt, id: { lte: target.id } },
                { createdAt: current.createdAt, id: { gt: current.id } },
              ],
            }
          : {
              OR: [
                { createdAt: { lt: target.createdAt } },
                { createdAt: target.createdAt, id: { lte: target.id } },
              ],
            }),
      },
    });
    const now = new Date();
    await this.prisma.$executeRaw`
      UPDATE conversation_participants
      SET last_read_message_id = ${target.id},
          last_read_at = ${now},
          unread_count = GREATEST(0, unread_count - ${newlyRead})
      WHERE conversation_id = ${conversationId} AND user_id = ${userId}
    `;
    const updated = await this.prisma.conversationParticipant.findUniqueOrThrow(
      {
        where: { conversationId_userId: { conversationId, userId } },
      },
    );
    return {
      conversationId,
      lastReadMessageId: target.id,
      lastReadAt: now.toISOString(),
      unreadCount: updated.unreadCount,
    };
  }

  async updateState(
    userId: string,
    conversationId: string,
    dto: UpdateConversationStateDto,
  ) {
    await this.assertMembership(userId, conversationId);
    let mutedUntil: Date | null | undefined;
    if (dto.mutedUntil !== undefined) {
      mutedUntil = dto.mutedUntil === null ? null : new Date(dto.mutedUntil);
      if (mutedUntil && isNaN(mutedUntil.getTime()))
        throw new BadRequestException('mutedUntil must be an ISO date');
    }
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: {
        ...(mutedUntil !== undefined ? { mutedUntil } : {}),
        ...(dto.archived !== undefined
          ? { archivedAt: dto.archived ? new Date() : null }
          : {}),
        ...(dto.pinned !== undefined
          ? { pinnedAt: dto.pinned ? new Date() : null }
          : {}),
      },
    });
    return this.getConversation(userId, conversationId);
  }

  async editMessage(userId: string, messageId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.assertMembership(userId, message.conversationId);
    if (message.senderId !== userId)
      throw new ForbiddenException('Only the sender can edit this message');
    if (message.type !== MessageType.TEXT || message.deletedAt)
      throw new BadRequestException('Only active text messages can be edited');
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { text: dto.text.trim(), editedAt: new Date() },
      include: messageInclude,
    });
    return this.toMessageDto(updated);
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.assertMembership(userId, message.conversationId);
    if (message.senderId !== userId)
      throw new ForbiddenException('Only the sender can delete this message');
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { text: null, deletedAt: message.deletedAt ?? new Date() },
      include: messageInclude,
    });
    return this.toMessageDto(updated);
  }

  async updateGroup(
    userId: string,
    conversationId: string,
    dto: UpdateGroupDto,
  ) {
    await this.assertGroupAdmin(userId, conversationId);
    if (dto.avatarMediaObjectId)
      await this.assertOwnedReadyMedia(
        userId,
        [dto.avatarMediaObjectId],
        MediaKind.IMAGE,
      );
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.avatarMediaObjectId !== undefined
          ? { avatarMediaId: dto.avatarMediaObjectId }
          : {}),
      },
    });
    return this.getConversation(userId, conversationId);
  }

  async addGroupMember(
    userId: string,
    conversationId: string,
    dto: GroupMemberDto,
  ) {
    await this.assertGroupAdmin(userId, conversationId);
    await this.socialPolicy.assertCanInteract(userId, dto.userId);
    await this.prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId: dto.userId } },
      update: {
        leftAt: null,
        joinedAt: new Date(),
        role: ConversationParticipantRole.MEMBER,
      },
      create: { conversationId, userId: dto.userId },
    });
    return this.getConversation(userId, conversationId);
  }

  async removeGroupMember(
    userId: string,
    conversationId: string,
    memberId: string,
  ) {
    await this.assertGroupAdmin(userId, conversationId);
    const member = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: memberId } },
    });
    if (!member || member.role === ConversationParticipantRole.OWNER)
      throw new BadRequestException('Group owner cannot be removed');
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: memberId } },
      data: { leftAt: new Date(), unreadCount: 0 },
    });
    return { message: 'Member removed' };
  }

  async leaveGroup(userId: string, conversationId: string) {
    const member = await this.assertMembership(userId, conversationId);
    if (member.conversation.type !== ConversationType.GROUP)
      throw new BadRequestException('Only groups can be left');
    if (member.role === ConversationParticipantRole.OWNER)
      throw new BadRequestException('Transfer ownership before leaving');
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { leftAt: new Date(), unreadCount: 0 },
    });
    return { message: 'Group left' };
  }

  private async assertGroupAdmin(userId: string, conversationId: string) {
    const member = await this.assertMembership(userId, conversationId);
    if (
      member.conversation.type !== ConversationType.GROUP ||
      (member.role !== ConversationParticipantRole.OWNER &&
        member.role !== ConversationParticipantRole.ADMIN)
    )
      throw new ForbiddenException('Group administrator permission required');
    return member;
  }

  private async toMessageDto(
    message: MessageRecord,
  ): Promise<MessageResponseDto> {
    const attachments = await Promise.all(
      message.attachments.map(async (attachment) => {
        const media = await this.mediaService.toDto(attachment.mediaObject);
        return {
          id: attachment.id,
          mediaObjectId: media.id,
          kind: media.kind,
          mimeType: media.mimeType,
          filename: media.originalFilename,
          sizeBytes: media.sizeBytes,
          url: media.publicUrl ?? null,
          width: media.width ?? null,
          height: media.height ?? null,
          durationMs: media.durationMs ?? null,
          position: attachment.position,
        };
      }),
    );
    const deleted = Boolean(message.deletedAt);
    return {
      id: message.id,
      conversationId: message.conversationId,
      type: message.type,
      text: deleted ? null : message.text,
      clientMessageId: message.clientMessageId,
      sender: message.sender,
      attachments: deleted ? [] : attachments,
      replyTo: message.replyToMessage
        ? {
            id: message.replyToMessage.id,
            type: message.replyToMessage.type,
            text: message.replyToMessage.deletedAt
              ? null
              : message.replyToMessage.text,
            senderDisplayName: message.replyToMessage.sender.displayName,
            isDeleted: Boolean(message.replyToMessage.deletedAt),
          }
        : null,
      durationMs: deleted ? null : message.durationMs,
      waveform: deleted
        ? null
        : ((message.waveform as number[] | null) ?? null),
      editedAt: message.editedAt?.toISOString() ?? null,
      deletedAt: message.deletedAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private async toConversationDto(
    conversation: ConversationRecord,
    viewerId: string,
  ): Promise<ConversationSummaryDto> {
    const viewer = conversation.participants.find(
      (item) => item.userId === viewerId,
    );
    if (!viewer) throw new NotFoundException('Conversation not found');
    const other = conversation.participants.find(
      (item) => item.userId !== viewerId,
    );
    let avatarUrl: string | null = null;
    if (conversation.avatarMedia) {
      avatarUrl =
        (await this.mediaService.toDto(conversation.avatarMedia)).publicUrl ??
        null;
    }
    const title =
      conversation.type === ConversationType.DIRECT
        ? other?.user.displayName || other?.user.username || 'Conversation'
        : conversation.title || 'Group';
    return {
      id: conversation.id,
      type: conversation.type,
      title,
      avatarUrl:
        conversation.type === ConversationType.DIRECT
          ? (other?.user.avatarUrl ?? null)
          : avatarUrl,
      participants: conversation.participants.map((item) => ({
        ...item.user,
        role: item.role,
        joinedAt: item.joinedAt.toISOString(),
      })),
      lastMessage: conversation.lastMessage
        ? await this.toMessageDto(conversation.lastMessage)
        : null,
      lastActivityAt: conversation.lastMessageAt?.toISOString() ?? null,
      unreadCount: viewer.unreadCount,
      isMuted: Boolean(viewer.mutedUntil && viewer.mutedUntil > new Date()),
      mutedUntil: viewer.mutedUntil?.toISOString() ?? null,
      isArchived: Boolean(viewer.archivedAt),
      isPinned: Boolean(viewer.pinnedAt),
      lastReadMessageId: viewer.lastReadMessageId,
    };
  }
}
