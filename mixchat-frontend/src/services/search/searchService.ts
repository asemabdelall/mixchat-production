import { apiClient } from "../api/apiClient";
import { components } from "../api/types/api.generated";

export type UniversalSearchResponseDto =
  components["schemas"]["UniversalSearchResponseDto"];
export type ExploreFeedResponseDto =
  components["schemas"]["ExploreFeedResponseDto"];
export type TrendingResponseDto = components["schemas"]["TrendingResponseDto"];
export type TrendingTagDto = components["schemas"]["TrendingTagDto"];
export type SearchMediaItemDto = components["schemas"]["SearchMediaItemDto"];
export type PublicProfileDto = components["schemas"]["PublicProfileDto"];
export type PostFeedItemDto = components["schemas"]["PostFeedItemDto"];

export interface UniversalSearchParams {
  q?: string;
  type?: "all" | "users" | "posts" | "tags" | "media";
  cursor?: string;
  limit?: number;
}

export interface ExploreFeedParams {
  cursor?: string;
  limit?: number;
}

export const searchService = {
  /**
   * Universal multi-entity search across users, posts, hashtags, and media
   */
  async searchUniversal(
    params: UniversalSearchParams,
    options?: { signal?: AbortSignal },
  ): Promise<UniversalSearchResponseDto> {
    const queryParams: Record<string, string> = {};
    if (params.q) queryParams.q = params.q;
    if (params.type) queryParams.type = params.type;
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.limit) queryParams.limit = String(params.limit);

    return apiClient.get<UniversalSearchResponseDto>("/search/universal", {
      params: queryParams,
      signal: options?.signal,
    });
  },

  /**
   * Dynamic trending hashtags & topics
   */
  async getTrending(): Promise<TrendingResponseDto> {
    return apiClient.get<TrendingResponseDto>("/search/trending");
  },

  /**
   * Algorithmic explore feed of visual posts & carousels
   */
  async getExploreFeed(
    params?: ExploreFeedParams,
  ): Promise<ExploreFeedResponseDto> {
    const queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = String(params.limit);

    return apiClient.get<ExploreFeedResponseDto>("/search/explore", {
      params: queryParams,
    });
  },

  /**
   * Get user's recent search queries from Redis
   */
  async getRecentSearches(): Promise<string[]> {
    const res = await apiClient.get<{ items: string[] }>("/search/recent");
    return res.items;
  },

  /**
   * Record a term in recent search history
   */
  async addRecentSearch(term: string): Promise<void> {
    await apiClient.post<{ message: string }>("/search/recent", { term });
  },

  /**
   * Delete a term from search history
   */
  async deleteRecentSearch(term: string): Promise<void> {
    await apiClient.delete<{ message: string }>(
      `/search/recent/${encodeURIComponent(term)}`,
    );
  },

  /**
   * Clear entire search history
   */
  async clearRecentSearches(): Promise<void> {
    await apiClient.delete<{ message: string }>("/search/recent");
  },
};
