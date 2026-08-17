import { User, Post } from "@/types";

export type SearchCategory = "all" | "users" | "posts" | "media" | "groups";

export type ExploreCategory =
  "for_you" | "trending" | "people" | "reels" | "gaming" | "tech";

export interface UserSearchResult {
  type: "user";
  id: string;
  user: User;
  mutualFriendsCount?: number;
  statusMessage?: string;
}

export interface PostSearchResult {
  type: "post";
  id: string;
  post: Post;
  matchedText?: string;
}

export interface MediaSearchResult {
  type: "media";
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  post: Post;
  author: User;
}

export interface GroupSearchResult {
  type: "group";
  id: string;
  name: string;
  membersCount: number;
  avatar: string;
  category: string;
  isMember?: boolean;
}

export type SearchResultItemData =
  UserSearchResult | PostSearchResult | MediaSearchResult | GroupSearchResult;

export interface MixPulseSummary {
  onlineFriendsCount: number;
  activeStoriesCount: number;
  trendingTag: string;
  unreadMessagesCount: number;
}
