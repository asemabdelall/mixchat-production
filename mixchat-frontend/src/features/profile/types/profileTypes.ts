import { User } from "@/types";

export type RelationshipState =
  | "self"
  | "none"
  | "following"
  | "follower"
  | "mutual_follow"
  | "friend"
  | "request_sent"
  | "request_received"
  | "blocked";

export type ProfileTabCategory =
  "posts" | "media" | "reels" | "likes" | "saved";

export interface ProfileSocialContext {
  mutualFriends: User[];
  sharedInterests: string[];
  commonGroup?: string;
  interactionSummary?: string;
}
