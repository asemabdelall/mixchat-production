import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConversationParticipantRole,
  ConversationType,
  MediaKind,
  MessageType,
} from '@prisma/client';

export class ChatUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl!:
    string | null;
  @ApiProperty() isVerified!: boolean;
  @ApiProperty() isPremium!: boolean;
}

export class ChatParticipantDto extends ChatUserDto {
  @ApiProperty({ enum: ConversationParticipantRole })
  role!: ConversationParticipantRole;
  @ApiProperty() joinedAt!: string;
}

export class MessageAttachmentDto {
  @ApiProperty() id!: string;
  @ApiProperty() mediaObjectId!: string;
  @ApiProperty({ enum: MediaKind }) kind!: MediaKind;
  @ApiProperty() mimeType!: string;
  @ApiProperty() filename!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiPropertyOptional({ type: String, nullable: true }) url!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) width!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) height!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) durationMs!:
    number | null;
  @ApiProperty() position!: number;
}

export class MessageReplyPreviewDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: MessageType }) type!: MessageType;
  @ApiPropertyOptional({ type: String, nullable: true }) text!: string | null;
  @ApiProperty() senderDisplayName!: string;
  @ApiProperty() isDeleted!: boolean;
}

export class MessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() conversationId!: string;
  @ApiProperty({ enum: MessageType }) type!: MessageType;
  @ApiPropertyOptional({ type: String, nullable: true }) text!: string | null;
  @ApiProperty() clientMessageId!: string;
  @ApiProperty({ type: ChatUserDto }) sender!: ChatUserDto;
  @ApiProperty({ type: [MessageAttachmentDto] })
  attachments!: MessageAttachmentDto[];
  @ApiPropertyOptional({ type: MessageReplyPreviewDto, nullable: true })
  replyTo!: MessageReplyPreviewDto | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) durationMs!:
    number | null;
  @ApiPropertyOptional({ type: [Number], nullable: true }) waveform!:
    number[] | null;
  @ApiPropertyOptional({ type: String, nullable: true }) editedAt!:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) deletedAt!:
    string | null;
  @ApiProperty() createdAt!: string;
}

export class ConversationSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ConversationType }) type!: ConversationType;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl!:
    string | null;
  @ApiProperty({ type: [ChatParticipantDto] })
  participants!: ChatParticipantDto[];
  @ApiPropertyOptional({ type: MessageResponseDto, nullable: true })
  lastMessage!: MessageResponseDto | null;
  @ApiPropertyOptional({ type: String, nullable: true }) lastActivityAt!:
    string | null;
  @ApiProperty() unreadCount!: number;
  @ApiProperty() isMuted!: boolean;
  @ApiPropertyOptional({ type: String, nullable: true }) mutedUntil!:
    string | null;
  @ApiProperty() isArchived!: boolean;
  @ApiProperty() isPinned!: boolean;
  @ApiPropertyOptional({ type: String, nullable: true }) lastReadMessageId!:
    string | null;
}

export class ChatPageInfoDto {
  @ApiPropertyOptional({ type: String, nullable: true }) nextCursor!:
    string | null;
  @ApiProperty() hasNextPage!: boolean;
}

export class PaginatedConversationsDto {
  @ApiProperty({ type: [ConversationSummaryDto] })
  items!: ConversationSummaryDto[];
  @ApiProperty({ type: ChatPageInfoDto }) pageInfo!: ChatPageInfoDto;
}

export class PaginatedMessagesDto {
  @ApiProperty({ type: [MessageResponseDto] }) items!: MessageResponseDto[];
  @ApiProperty({ type: ChatPageInfoDto }) pageInfo!: ChatPageInfoDto;
}

export class ReadStateDto {
  @ApiProperty() conversationId!: string;
  @ApiProperty() lastReadMessageId!: string;
  @ApiProperty() lastReadAt!: string;
  @ApiProperty() unreadCount!: number;
}
