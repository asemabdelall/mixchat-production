import { User } from "@/types";

export type LocationVisibilityMode = "ghost" | "approximate" | "friends" | "discoverable";

export type MapFilterCategory = "all" | "friends" | "stories" | "online" | "trending";

export interface MapMarkerData {
  id: string;
  user: User;
  lat: number;
  lng: number;
  topPercent: string;
  leftPercent: string;
  distanceKm: number;
  statusMessage: string;
  locationName: string;
  hasStory?: boolean;
  storyMediaUrl?: string;
  mutualFriendsCount?: number;
  interestTags?: string[];
  lastActive: string;
}

export interface MapClusterData {
  id: string;
  topPercent: string;
  leftPercent: string;
  count: number;
  users: User[];
  label: string;
}
