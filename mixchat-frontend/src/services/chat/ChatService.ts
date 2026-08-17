import { apiClient } from "@/services/api/apiClient";
import type { components } from "@/services/api/types/api.generated";

export type ConversationDto = components["schemas"]["ConversationSummaryDto"];
export type MessageDto = components["schemas"]["MessageResponseDto"];
export type CreateConversationDto =
  components["schemas"]["CreateConversationDto"];
export type SendMessageDto = components["schemas"]["SendMessageDto"];
export type PaginatedConversationsDto =
  components["schemas"]["PaginatedConversationsDto"];
export type PaginatedMessagesDto =
  components["schemas"]["PaginatedMessagesDto"];
export type ReadStateDto = components["schemas"]["ReadStateDto"];
export type UpdateConversationStateDto =
  components["schemas"]["UpdateConversationStateDto"];
export type UpdateGroupDto = components["schemas"]["UpdateGroupDto"];

export interface ChatPageOptions {
  cursor?: string;
  limit?: number;
  archived?: boolean;
}

export const chatService = {
  listConversations(
    options: ChatPageOptions = {},
  ): Promise<PaginatedConversationsDto> {
    return apiClient.get("/chat/conversations", {
      params: {
        cursor: options.cursor,
        limit: options.limit,
        archived: options.archived,
      },
    });
  },

  getConversation(conversationId: string): Promise<ConversationDto> {
    return apiClient.get(`/chat/conversations/${conversationId}`);
  },

  createConversation(data: CreateConversationDto): Promise<ConversationDto> {
    return apiClient.post("/chat/conversations", data);
  },

  listMessages(
    conversationId: string,
    options: ChatPageOptions = {},
  ): Promise<PaginatedMessagesDto> {
    return apiClient.get(`/chat/conversations/${conversationId}/messages`, {
      params: {
        cursor: options.cursor,
        limit: options.limit,
        archived: options.archived,
      },
    });
  },

  sendMessage(
    conversationId: string,
    data: SendMessageDto,
  ): Promise<MessageDto> {
    return apiClient.post(
      `/chat/conversations/${conversationId}/messages`,
      data,
    );
  },

  markRead(
    conversationId: string,
    lastReadMessageId: string,
  ): Promise<ReadStateDto> {
    return apiClient.patch(`/chat/conversations/${conversationId}/read`, {
      lastReadMessageId,
    });
  },

  updateState(
    conversationId: string,
    data: UpdateConversationStateDto,
  ): Promise<ConversationDto> {
    return apiClient.patch(`/chat/conversations/${conversationId}/state`, data);
  },

  editMessage(messageId: string, text: string): Promise<MessageDto> {
    return apiClient.patch(`/chat/messages/${messageId}`, { text });
  },

  deleteMessage(messageId: string): Promise<MessageDto> {
    return apiClient.delete(`/chat/messages/${messageId}`);
  },

  updateGroup(
    conversationId: string,
    data: UpdateGroupDto,
  ): Promise<ConversationDto> {
    return apiClient.patch(`/chat/conversations/${conversationId}/group`, data);
  },

  addGroupMember(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDto> {
    return apiClient.post(`/chat/conversations/${conversationId}/members`, {
      userId,
    });
  },

  removeGroupMember(
    conversationId: string,
    userId: string,
  ): Promise<{ message: string }> {
    return apiClient.delete(
      `/chat/conversations/${conversationId}/members/${userId}`,
    );
  },

  leaveGroup(conversationId: string): Promise<{ message: string }> {
    return apiClient.delete(`/chat/conversations/${conversationId}/leave`);
  },
};

export default chatService;
