import { apiClient } from "../api/apiClient";
import type { components } from "../api/types/api.generated";
import { Post, User } from "@/types";

export type CreatePostDto = components["schemas"]["CreatePostDto"];
export type UpdatePostDto = components["schemas"]["UpdatePostDto"];
export type PostFeedItemDto = components["schemas"]["PostFeedItemDto"];
export type PaginatedFeedResponseDto =
  components["schemas"]["PaginatedFeedResponseDto"];
export type LikeResponseDto = components["schemas"]["LikeResponseDto"];
export type BookmarkResponseDto = components["schemas"]["BookmarkResponseDto"];
export type RepostResponseDto = components["schemas"]["RepostResponseDto"];
export type SimpleMessageResponseDto =
  components["schemas"]["SimpleMessageResponseDto"];

export interface FeedQueryOptions {
  cursor?: string;
  limit?: number;
  tab?: "for_you" | "following" | "trending";
}

export interface UserPostsQueryOptions {
  cursor?: string;
  limit?: number;
}

/**
 * Formats ISO timestamp to human friendly relative string
 */
export function formatPostTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * Transforms backend PostFeedItemDto to the UI Post view model
 */
export function mapDtoToPost(item: PostFeedItemDto): Post {
  const mediaList = item.media || [];
  const videoMedia = mediaList.find((m) => m.kind === "VIDEO");

  let mediaType: "image" | "video" | "carousel" | undefined;
  if (videoMedia) {
    mediaType = "video";
  } else if (mediaList.length > 1) {
    mediaType = "carousel";
  } else if (mediaList.length === 1) {
    mediaType = "image";
  }

  let audience: "public" | "friends" | "close_friends" = "public";
  if (item.visibility === "FOLLOWERS") {
    audience = "friends";
  } else if (item.visibility === "CLOSE_FRIENDS") {
    audience = "close_friends";
  }

  const authorUser: User = {
    id: item.author.id,
    username: item.author.username,
    displayName: item.author.displayName || item.author.username,
    avatar:
      item.author.avatarUrl ||
      "/mixchat-icon.png",
    role: item.author.isVerified ? "verified" : "user",
    online: false,
    isPremium: item.author.isPremium,
    followersCount: 0,
    followingCount: 0,
  };

  return {
    id: item.id,
    userId: item.author.id,
    user: authorUser,
    content: item.content,
    mediaUrls: mediaList.map((m) => m.url),
    mediaItems: mediaList.map((m) => ({ url: m.url, kind: m.kind })),
    mediaType,
    videoUrl: videoMedia?.url,
    likesCount: item.stats.likesCount,
    commentsCount: item.stats.commentsCount,
    sharesCount: 0,
    repostsCount: item.stats.repostsCount,
    isLiked: item.viewer.hasLiked,
    isBookmarked: item.viewer.hasBookmarked,
    isReposted: item.viewer.hasReposted,
    createdAt: formatPostTime(item.createdAt),
    locationTag: item.locationTag || undefined,
    audience,
  };
}

export const postsService = {
  /**
   * Create a new post with text and/or attached READY media IDs
   */
  async createPost(dto: CreatePostDto): Promise<PostFeedItemDto> {
    return apiClient.post<PostFeedItemDto>("/posts", dto);
  },

  /**
   * Fetch paginated feed for current user (For You, Following, Trending)
   */
  async getFeed(
    query: FeedQueryOptions = {},
  ): Promise<PaginatedFeedResponseDto> {
    return apiClient.get<PaginatedFeedResponseDto>("/posts/feed", {
      params: {
        cursor: query.cursor,
        limit: query.limit,
        tab: query.tab,
      },
    });
  },

  /**
   * Fetch single post by ID with real backend data
   */
  async getPost(postId: string): Promise<PostFeedItemDto> {
    return apiClient.get<PostFeedItemDto>(`/posts/${postId}`);
  },

  /**
   * Fetch user posts for profile pages with cursor pagination
   */
  async getUserPosts(
    username: string,
    query: UserPostsQueryOptions = {},
  ): Promise<PaginatedFeedResponseDto> {
    return apiClient.get<PaginatedFeedResponseDto>(`/posts/user/${username}`, {
      params: {
        cursor: query.cursor,
        limit: query.limit,
      },
    });
  },

  /**
   * Fetch bookmarked / saved posts for current user
   */
  async getBookmarkedPosts(
    query: UserPostsQueryOptions = {},
  ): Promise<PaginatedFeedResponseDto> {
    return apiClient.get<PaginatedFeedResponseDto>("/posts/bookmarks", {
      params: {
        cursor: query.cursor,
        limit: query.limit,
      },
    });
  },

  /**
   * Idempotent like mutation
   */
  async likePost(postId: string): Promise<LikeResponseDto> {
    return apiClient.put<LikeResponseDto>(`/posts/${postId}/like`);
  },

  /**
   * Idempotent unlike mutation
   */
  async unlikePost(postId: string): Promise<LikeResponseDto> {
    return apiClient.delete<LikeResponseDto>(`/posts/${postId}/like`);
  },

  /**
   * Idempotent bookmark mutation
   */
  async bookmarkPost(postId: string): Promise<BookmarkResponseDto> {
    return apiClient.put<BookmarkResponseDto>(`/posts/${postId}/bookmark`);
  },

  /**
   * Idempotent unbookmark mutation
   */
  async unbookmarkPost(postId: string): Promise<BookmarkResponseDto> {
    return apiClient.delete<BookmarkResponseDto>(`/posts/${postId}/bookmark`);
  },

  /**
   * Idempotent repost mutation
   */
  async repostPost(postId: string): Promise<RepostResponseDto> {
    return apiClient.put<RepostResponseDto>(`/posts/${postId}/repost`);
  },

  /**
   * Idempotent undo repost mutation
   */
  async unrepostPost(postId: string): Promise<RepostResponseDto> {
    return apiClient.delete<RepostResponseDto>(`/posts/${postId}/repost`);
  },

  /**
   * Update post content / visibility (author only)
   */
  async updatePost(
    postId: string,
    dto: UpdatePostDto,
  ): Promise<PostFeedItemDto> {
    return apiClient.patch<PostFeedItemDto>(`/posts/${postId}`, dto);
  },

  /**
   * Delete post (author only)
   */
  async deletePost(postId: string): Promise<SimpleMessageResponseDto> {
    return apiClient.delete<SimpleMessageResponseDto>(`/posts/${postId}`);
  },
};

export default postsService;
