import { apiClient } from "../api/apiClient";
import type { components } from "../api/types/api.generated";

export type AnonymousPersonaDto = components["schemas"]["AnonymousPersonaDto"];
export type AnonymousRevealConsentDto =
  components["schemas"]["AnonymousRevealConsentDto"];
export type AnonymousRevealedUserDto =
  components["schemas"]["AnonymousRevealedUserDto"];
export type AnonymousMessageDto = components["schemas"]["AnonymousMessageDto"];
export type AnonymousSessionDto = components["schemas"]["AnonymousSessionDto"];
export type AnonymousQueueStatusDto =
  components["schemas"]["AnonymousQueueStatusDto"];
export type AnonymousActionResponseDto =
  components["schemas"]["AnonymousActionResponseDto"];
export type AnonymousReportResponseDto =
  components["schemas"]["AnonymousReportResponseDto"];
export type JoinQueueDto = components["schemas"]["JoinQueueDto"];
export type SendAnonymousMessageDto =
  components["schemas"]["SendAnonymousMessageDto"];
export type SkipAnonymousSessionDto =
  components["schemas"]["SkipAnonymousSessionDto"];
export type ReportAnonymousSessionDto =
  components["schemas"]["ReportAnonymousSessionDto"];

export class AnonymousService {
  /**
   * Joins anonymous matchmaking queue with optional interest tags
   */
  async joinQueue(interests?: string[]): Promise<AnonymousQueueStatusDto> {
    return apiClient.post<AnonymousQueueStatusDto>("/anonymous/queue/join", {
      interests: interests || [],
    });
  }

  /**
   * Leaves matchmaking queue
   */
  async leaveQueue(): Promise<AnonymousActionResponseDto> {
    return apiClient.post<AnonymousActionResponseDto>(
      "/anonymous/queue/leave",
      {},
    );
  }

  /**
   * Gets current queue or active session status
   */
  async getStatus(): Promise<AnonymousQueueStatusDto> {
    return apiClient.get<AnonymousQueueStatusDto>("/anonymous/queue/status");
  }

  /**
   * Gets full session details & messages
   */
  async getSession(sessionId: string): Promise<AnonymousSessionDto> {
    return apiClient.get<AnonymousSessionDto>(
      `/anonymous/session/${sessionId}`,
    );
  }

  /**
   * Sends text or voice note message
   */
  async sendMessage(
    sessionId: string,
    payload: SendAnonymousMessageDto,
  ): Promise<AnonymousMessageDto> {
    return apiClient.post<AnonymousMessageDto>(
      `/anonymous/session/${sessionId}/message`,
      payload,
    );
  }

  /**
   * Skips match and optionally requeues
   */
  async skipSession(
    sessionId: string,
    requeue: boolean = true,
    interests?: string[],
  ): Promise<AnonymousQueueStatusDto> {
    return apiClient.post<AnonymousQueueStatusDto>(
      `/anonymous/session/${sessionId}/skip`,
      { requeue, interests },
    );
  }

  /**
   * Leaves and ends active session
   */
  async leaveSession(sessionId: string): Promise<AnonymousActionResponseDto> {
    return apiClient.post<AnonymousActionResponseDto>(
      `/anonymous/session/${sessionId}/leave`,
      {},
    );
  }

  /**
   * Requests or accepts mutual identity reveal
   */
  async requestReveal(sessionId: string): Promise<AnonymousSessionDto> {
    return apiClient.post<AnonymousSessionDto>(
      `/anonymous/session/${sessionId}/reveal`,
      {},
    );
  }

  /**
   * Cancels pending reveal request
   */
  async cancelReveal(sessionId: string): Promise<AnonymousSessionDto> {
    return apiClient.delete<AnonymousSessionDto>(
      `/anonymous/session/${sessionId}/reveal`,
    );
  }

  /**
   * Anonymously blocks partner without identity disclosure
   */
  async blockPartner(sessionId: string): Promise<AnonymousActionResponseDto> {
    return apiClient.post<AnonymousActionResponseDto>(
      `/anonymous/session/${sessionId}/block`,
      {},
    );
  }

  /**
   * Anonymously reports partner for moderation
   */
  async reportPartner(
    sessionId: string,
    payload: ReportAnonymousSessionDto,
  ): Promise<AnonymousReportResponseDto> {
    return apiClient.post<AnonymousReportResponseDto>(
      `/anonymous/session/${sessionId}/report`,
      payload,
    );
  }
}

export const anonymousService = new AnonymousService();
