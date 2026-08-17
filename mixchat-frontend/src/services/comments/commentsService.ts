import { apiClient } from "../api/apiClient";
import { components } from "../api/types/api.generated";

export type CommentDto = components["schemas"]["CommentDto"];
export type CommentAuthorDto = components["schemas"]["CommentAuthorDto"];
export type CommentMentionDto = components["schemas"]["CommentMentionDto"];
export type CommentStatsDto = components["schemas"]["CommentStatsDto"];
export type CommentViewerDto = components["schemas"]["CommentViewerDto"];
export type PaginatedCommentsResponseDto =
  components["schemas"]["PaginatedCommentsResponseDto"];
export type CommentLikeResponseDto =
  components["schemas"]["CommentLikeResponseDto"];
export type SimpleMessageResponseDto =
  components["schemas"]["SimpleMessageResponseDto"];

export interface CommentsQueryParams {
  cursor?: string;
  limit?: number;
}

export const commentsService = {
  /**
   * Create a top-level comment on a post
   */
  async createComment(postId: string, content: string): Promise<CommentDto> {
    return apiClient.post<CommentDto>(`/posts/${postId}/comments`, { content });
  },

  /**
   * Get cursor-paginated top-level comments for a post
   */
  async getPostComments(
    postId: string,
    params?: CommentsQueryParams,
  ): Promise<PaginatedCommentsResponseDto> {
    return apiClient.get<PaginatedCommentsResponseDto>(
      `/posts/${postId}/comments`,
      {
        params: {
          ...(params?.cursor ? { cursor: params.cursor } : {}),
          ...(params?.limit ? { limit: params.limit } : {}),
        },
      },
    );
  },

  /**
   * Create a top-level comment on a Reel
   */
  async createReelComment(
    reelId: string,
    content: string,
  ): Promise<CommentDto> {
    return apiClient.post<CommentDto>(`/reels/${reelId}/comments`, { content });
  },

  /**
   * Get cursor-paginated top-level comments for a Reel
   */
  async getReelComments(
    reelId: string,
    params?: CommentsQueryParams,
  ): Promise<PaginatedCommentsResponseDto> {
    return apiClient.get<PaginatedCommentsResponseDto>(
      `/reels/${reelId}/comments`,
      {
        params: {
          ...(params?.cursor ? { cursor: params.cursor } : {}),
          ...(params?.limit ? { limit: params.limit } : {}),
        },
      },
    );
  },

  /**
   * Reply to an existing comment
   */
  async createReply(commentId: string, content: string): Promise<CommentDto> {
    return apiClient.post<CommentDto>(`/comments/${commentId}/replies`, {
      content,
    });
  },

  /**
   * Get cursor-paginated replies for a comment thread
   */
  async getCommentReplies(
    commentId: string,
    params?: CommentsQueryParams,
  ): Promise<PaginatedCommentsResponseDto> {
    return apiClient.get<PaginatedCommentsResponseDto>(
      `/comments/${commentId}/replies`,
      {
        params: {
          ...(params?.cursor ? { cursor: params.cursor } : {}),
          ...(params?.limit ? { limit: params.limit } : {}),
        },
      },
    );
  },

  /**
   * Update comment content (author only)
   */
  async updateComment(commentId: string, content: string): Promise<CommentDto> {
    return apiClient.patch<CommentDto>(`/comments/${commentId}`, { content });
  },

  /**
   * Delete comment (author only)
   */
  async deleteComment(commentId: string): Promise<SimpleMessageResponseDto> {
    return apiClient.delete<SimpleMessageResponseDto>(`/comments/${commentId}`);
  },

  /**
   * Idempotent like comment mutation
   */
  async likeComment(commentId: string): Promise<CommentLikeResponseDto> {
    return apiClient.put<CommentLikeResponseDto>(`/comments/${commentId}/like`);
  },

  /**
   * Idempotent unlike comment mutation
   */
  async unlikeComment(commentId: string): Promise<CommentLikeResponseDto> {
    return apiClient.delete<CommentLikeResponseDto>(
      `/comments/${commentId}/like`,
    );
  },
};
