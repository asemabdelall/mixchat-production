import { apiClient } from "@/services/api/apiClient";
import type { components } from "@/services/api/types/api.generated";

export type NotificationItemDto =
  components["schemas"]["NotificationResponseDto"];
export type NotificationsListDto =
  components["schemas"]["NotificationsListResponseDto"];
export type NotificationFilter =
  "ALL" | "SOCIAL" | "LIKES" | "COMMENTS" | "MENTIONS";

export interface ListNotificationsParams {
  cursor?: string;
  limit?: number;
  filter?: NotificationFilter;
}

export const notificationsService = {
  /**
   * Get cursor-paginated notifications list
   */
  async getNotifications(
    params?: ListNotificationsParams,
  ): Promise<NotificationsListDto> {
    const queryParams: Record<string, string | number | undefined> = {
      cursor: params?.cursor,
      limit: params?.limit,
      filter: params?.filter,
    };
    return apiClient.get<NotificationsListDto>("/notifications", {
      params: queryParams,
    });
  },

  /**
   * Get unread notifications counter
   */
  async getUnreadCount(): Promise<{ unreadCount: number }> {
    return apiClient.get<{ unreadCount: number }>(
      "/notifications/unread-count",
    );
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(
    id: string,
  ): Promise<{ message: string; unreadCount: number }> {
    return apiClient.patch<{ message: string; unreadCount: number }>(
      `/notifications/${encodeURIComponent(id)}/read`,
    );
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ message: string; unreadCount: number }> {
    return apiClient.patch<{ message: string; unreadCount: number }>(
      "/notifications/read-all",
    );
  },
};
