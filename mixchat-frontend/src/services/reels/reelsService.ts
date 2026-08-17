import { apiClient } from "../api/apiClient";
import { components } from "../api/types/api.generated";

export type ReelItemDto = components["schemas"]["ReelItemDto"];
export type PaginatedReelsResponseDto =
  components["schemas"]["PaginatedReelsResponseDto"];
export type CreateReelDto = components["schemas"]["CreateReelDto"];
export type ReelLikeResponseDto = components["schemas"]["ReelLikeResponseDto"];
export type ReelBookmarkResponseDto =
  components["schemas"]["ReelBookmarkResponseDto"];
export type WatchStartDto = components["schemas"]["WatchStartDto"];
export type WatchProgressDto = components["schemas"]["WatchProgressDto"];
export type WatchEndDto = components["schemas"]["WatchEndDto"];
export type WatchTelemetryResponseDto =
  components["schemas"]["WatchTelemetryResponseDto"];
export type CommentDto = components["schemas"]["CommentDto"];
export type PaginatedCommentsResponseDto =
  components["schemas"]["PaginatedCommentsResponseDto"];
export type SimpleMessageResponseDto =
  components["schemas"]["SimpleMessageResponseDto"];

export const reelsService = {
  /**
   * Fetch paginated feed (For You or Following)
   */
  async getFeed(
    feed: "foryou" | "following" = "foryou",
    cursor?: string,
    limit = 10,
  ): Promise<PaginatedReelsResponseDto> {
    const params = new URLSearchParams();
    params.set("feed", feed);
    params.set("limit", limit.toString());
    if (cursor) params.set("cursor", cursor);

    return await apiClient.get<PaginatedReelsResponseDto>(
      `/reels?${params.toString()}`,
    );
  },

  /**
   * Fetch reels created by a specific user for profile tabs
   */
  async getUserReels(
    username: string,
    cursor?: string,
    limit = 12,
  ): Promise<PaginatedReelsResponseDto> {
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    if (cursor) params.set("cursor", cursor);

    return await apiClient.get<PaginatedReelsResponseDto>(
      `/reels/user/${encodeURIComponent(username)}?${params.toString()}`,
    );
  },

  /**
   * Fetch single reel by ID
   */
  async getReel(id: string): Promise<ReelItemDto> {
    return await apiClient.get<ReelItemDto>(`/reels/${id}`);
  },

  /**
   * Create a new vertical Reel from a READY video MediaObject
   */
  async createReel(dto: CreateReelDto): Promise<ReelItemDto> {
    return await apiClient.post<ReelItemDto>("/reels", dto);
  },

  /**
   * Delete a Reel (Author only)
   */
  async deleteReel(id: string): Promise<SimpleMessageResponseDto> {
    return await apiClient.delete<SimpleMessageResponseDto>(`/reels/${id}`);
  },

  /**
   * Like a Reel (Idempotent)
   */
  async likeReel(id: string): Promise<ReelLikeResponseDto> {
    return await apiClient.put<ReelLikeResponseDto>(`/reels/${id}/like`);
  },

  /**
   * Unlike a Reel (Idempotent)
   */
  async unlikeReel(id: string): Promise<ReelLikeResponseDto> {
    return await apiClient.delete<ReelLikeResponseDto>(`/reels/${id}/like`);
  },

  /**
   * Bookmark a Reel (Idempotent)
   */
  async bookmarkReel(id: string): Promise<ReelBookmarkResponseDto> {
    return await apiClient.put<ReelBookmarkResponseDto>(
      `/reels/${id}/bookmark`,
    );
  },

  /**
   * Unbookmark a Reel (Idempotent)
   */
  async unbookmarkReel(id: string): Promise<ReelBookmarkResponseDto> {
    return await apiClient.delete<ReelBookmarkResponseDto>(
      `/reels/${id}/bookmark`,
    );
  },

  /**
   * Get cursor-paginated comments for a Reel
   */
  async getReelComments(
    reelId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedCommentsResponseDto> {
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    if (cursor) params.set("cursor", cursor);

    return await apiClient.get<PaginatedCommentsResponseDto>(
      `/reels/${reelId}/comments?${params.toString()}`,
    );
  },

  /**
   * Add a top-level comment to a Reel
   */
  async createReelComment(
    reelId: string,
    content: string,
  ): Promise<CommentDto> {
    return await apiClient.post<CommentDto>(`/reels/${reelId}/comments`, {
      content,
    });
  },

  /**
   * Watch Telemetry: Start
   */
  async watchStart(
    reelId: string,
    sessionId: string,
  ): Promise<WatchTelemetryResponseDto> {
    return await apiClient.post<WatchTelemetryResponseDto>(
      `/reels/${reelId}/watch/start`,
      {
        sessionId,
      },
    );
  },

  /**
   * Watch Telemetry: Checkpoint Progress
   */
  async watchProgress(
    reelId: string,
    dto: WatchProgressDto,
  ): Promise<WatchTelemetryResponseDto> {
    return await apiClient.patch<WatchTelemetryResponseDto>(
      `/reels/${reelId}/watch/progress`,
      dto,
    );
  },

  /**
   * Watch Telemetry: End Session
   */
  async watchEnd(
    reelId: string,
    dto: WatchEndDto,
  ): Promise<WatchTelemetryResponseDto> {
    return await apiClient.post<WatchTelemetryResponseDto>(
      `/reels/${reelId}/watch/end`,
      dto,
    );
  },
};
