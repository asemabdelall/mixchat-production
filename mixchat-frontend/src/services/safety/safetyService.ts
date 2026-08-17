import { apiClient } from "../api/apiClient";

export type ReportTargetType =
  | "USER"
  | "POST"
  | "COMMENT"
  | "STORY"
  | "REEL"
  | "MESSAGE"
  | "ANONYMOUS_SESSION";

export type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "HATE_OR_ABUSE"
  | "SEXUAL_CONTENT"
  | "VIOLENCE"
  | "SCAM_OR_FRAUD"
  | "IMPERSONATION"
  | "PRIVACY"
  | "SELF_HARM"
  | "OTHER";

export interface CreateReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

export interface ReportReceipt {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  status: string;
  createdAt: string;
  message: string;
}

export interface BlockedUserItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  blockedAt: string;
}

export interface PaginatedBlockedUsers {
  items: BlockedUserItem[];
  nextCursor?: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface MutedUserItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  mutedAt: string;
}

export interface PaginatedMutedUsers {
  items: MutedUserItem[];
  nextCursor?: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface SafetyActionResult {
  success: boolean;
  message: string;
}

class SafetyService {
  /**
   * Submit a unified safety report for any entity or anonymous session
   */
  async submitReport(payload: CreateReportPayload): Promise<ReportReceipt> {
    return apiClient.post<ReportReceipt>("/safety/reports", payload);
  }

  /**
   * List reports submitted by the current user
   */
  async getMyReports(limit = 20): Promise<ReportReceipt[]> {
    return apiClient.get<ReportReceipt[]>("/safety/reports/mine", {
      params: { limit },
    });
  }

  /**
   * Block a user account
   */
  async blockUser(userId: string): Promise<SafetyActionResult> {
    return apiClient.post<SafetyActionResult>(`/safety/block/${userId}`);
  }

  /**
   * Unblock a user account
   */
  async unblockUser(userId: string): Promise<SafetyActionResult> {
    return apiClient.delete<SafetyActionResult>(`/safety/block/${userId}`);
  }

  /**
   * Get list of blocked accounts
   */
  async getBlockedUsers(
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedBlockedUsers> {
    return apiClient.get<PaginatedBlockedUsers>("/safety/blocked", {
      params: { cursor, limit },
    });
  }

  /**
   * Mute an account
   */
  async muteUser(userId: string): Promise<SafetyActionResult> {
    return apiClient.post<SafetyActionResult>(`/safety/mute/${userId}`);
  }

  /**
   * Unmute an account
   */
  async unmuteUser(userId: string): Promise<SafetyActionResult> {
    return apiClient.delete<SafetyActionResult>(`/safety/mute/${userId}`);
  }

  /**
   * Get list of muted accounts
   */
  async getMutedUsers(
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedMutedUsers> {
    return apiClient.get<PaginatedMutedUsers>("/safety/muted", {
      params: { cursor, limit },
    });
  }
}

export const safetyService = new SafetyService();
