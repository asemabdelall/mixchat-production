import { apiClient } from '../api/apiClient';
import type { components } from '../api/types/api.generated';

export type CallResponseDto = components['schemas']['CallResponseDto'];
export type CallTokenResponseDto = components['schemas']['CallTokenResponseDto'];
export type CallParticipantDto = components['schemas']['CallParticipantDto'];
export type CreateCallDto = components['schemas']['CreateCallDto'];

export interface CallHistoryQuery {
  conversationId?: string;
  cursor?: string;
  limit?: number;
}

export interface CallHistoryResponse {
  calls: CallResponseDto[];
  nextCursor: string | null;
}

class CallsService {
  /**
   * Initiate a new voice or video call
   */
  async initiateCall(payload: CreateCallDto): Promise<CallResponseDto> {
    return apiClient.post<CallResponseDto>('/calls', payload);
  }

  /**
   * Get active or ringing call for session restoration
   */
  async getCurrentCall(): Promise<CallResponseDto | null> {
    try {
      return await apiClient.get<CallResponseDto | null>('/calls/current');
    } catch {
      return null;
    }
  }

  /**
   * Get call details by ID
   */
  async getCallById(callId: string): Promise<CallResponseDto> {
    return apiClient.get<CallResponseDto>(`/calls/${callId}`);
  }

  /**
   * Request fresh LiveKit connection token for an active call
   */
  async getCallToken(callId: string): Promise<CallTokenResponseDto> {
    return apiClient.post<CallTokenResponseDto>(`/calls/${callId}/token`, {});
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(callId: string): Promise<CallResponseDto> {
    return apiClient.post<CallResponseDto>(`/calls/${callId}/accept`, {});
  }

  /**
   * Decline an incoming call
   */
  async declineCall(callId: string): Promise<CallResponseDto> {
    return apiClient.post<CallResponseDto>(`/calls/${callId}/decline`, {});
  }

  /**
   * Cancel an outgoing ringing call
   */
  async cancelCall(callId: string): Promise<CallResponseDto> {
    return apiClient.post<CallResponseDto>(`/calls/${callId}/cancel`, {});
  }

  /**
   * Hang up / end an active call
   */
  async endCall(callId: string): Promise<CallResponseDto> {
    return apiClient.post<CallResponseDto>(`/calls/${callId}/end`, {});
  }

  /**
   * Get cursor-paginated call history
   */
  async getCallHistory(query: CallHistoryQuery = {}): Promise<CallHistoryResponse> {
    return apiClient.get<CallHistoryResponse>('/calls/history', {
      params: {
        ...(query.conversationId && { conversationId: query.conversationId }),
        ...(query.cursor && { cursor: query.cursor }),
        ...(query.limit && { limit: query.limit }),
      },
    });
  }
}

export const callsService = new CallsService();
