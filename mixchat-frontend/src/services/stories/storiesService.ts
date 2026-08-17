import { apiClient } from "../api/apiClient";
import { components } from "../api/types/api.generated";

export type StoryItemDto = components["schemas"]["StoryItemDto"];
export type StoryGroupDto = components["schemas"]["StoryGroupDto"];
export type ActiveStoriesResponseDto =
  components["schemas"]["ActiveStoriesResponseDto"];
export type StoryViewersResponseDto =
  components["schemas"]["StoryViewersResponseDto"];
export type StoryViewerItemDto = components["schemas"]["StoryViewerItemDto"];
export type StoryRepliesResponseDto =
  components["schemas"]["StoryRepliesResponseDto"];
export type StoryReplyItemDto = components["schemas"]["StoryReplyItemDto"];
export type StoryArchiveResponseDto =
  components["schemas"]["StoryArchiveResponseDto"];
export type CreateStoryDto = components["schemas"]["CreateStoryDto"];
export type ReactStoryDto = components["schemas"]["ReactStoryDto"];
export type CreateStoryReplyDto = components["schemas"]["CreateStoryReplyDto"];
export type StoryAudience = components["schemas"]["CreateStoryDto"]["audience"];
export type StoryReactionType =
  components["schemas"]["ReactStoryDto"]["reaction"];

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export const storiesService = {
  /**
   * Get active 24h story groups grouped by author for story tray & viewer
   */
  async getActiveStories(): Promise<ActiveStoriesResponseDto> {
    return apiClient.get<ActiveStoriesResponseDto>("/stories/active");
  },

  /**
   * Get a single story by ID
   */
  async getStoryById(storyId: string): Promise<StoryItemDto> {
    return apiClient.get<StoryItemDto>(`/stories/${storyId}`);
  },

  /**
   * Create a new story using an uploaded READY MediaObject ID
   */
  async createStory(dto: CreateStoryDto): Promise<StoryItemDto> {
    return apiClient.post<StoryItemDto>("/stories", dto);
  },

  /**
   * Delete a story (Author only)
   */
  async deleteStory(storyId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/stories/${storyId}`);
  },

  /**
   * Record a view for a story (idempotent)
   */
  async recordView(storyId: string): Promise<{ success: boolean }> {
    return apiClient.put<{ success: boolean }>(`/stories/${storyId}/view`);
  },

  /**
   * Get viewers list for a story (Author only, cursor-paginated)
   */
  async getViewers(
    storyId: string,
    params?: PaginationParams,
  ): Promise<StoryViewersResponseDto> {
    const queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = String(params.limit);

    return apiClient.get<StoryViewersResponseDto>(
      `/stories/${storyId}/viewers`,
      {
        params: queryParams,
      },
    );
  },

  /**
   * React to a story with an emoji
   */
  async reactToStory(
    storyId: string,
    reaction: StoryReactionType,
  ): Promise<{ success: boolean; reaction: string }> {
    return apiClient.put<{ success: boolean; reaction: string }>(
      `/stories/${storyId}/reaction`,
      {
        reaction,
      },
    );
  },

  /**
   * Remove reaction from story
   */
  async removeReaction(storyId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(
      `/stories/${storyId}/reaction`,
    );
  },

  /**
   * Reply to a story
   */
  async createReply(
    storyId: string,
    content: string,
  ): Promise<StoryReplyItemDto> {
    return apiClient.post<StoryReplyItemDto>(`/stories/${storyId}/replies`, {
      content,
    });
  },

  /**
   * Get replies for a story (Author only, cursor-paginated)
   */
  async getReplies(
    storyId: string,
    params?: PaginationParams,
  ): Promise<StoryRepliesResponseDto> {
    const queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = String(params.limit);

    return apiClient.get<StoryRepliesResponseDto>(
      `/stories/${storyId}/replies`,
      {
        params: queryParams,
      },
    );
  },

  /**
   * Get user's own Story Archive (cursor-paginated)
   */
  async getArchive(
    params?: PaginationParams,
  ): Promise<StoryArchiveResponseDto> {
    const queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.limit) queryParams.limit = String(params.limit);

    return apiClient.get<StoryArchiveResponseDto>("/stories/archive", {
      params: queryParams,
    });
  },
};
