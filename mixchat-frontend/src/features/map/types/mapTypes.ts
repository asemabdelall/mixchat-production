import type { MapFriend } from "@/services/map/MapService";

export type LocationVisibilityMode =
  "ghost" | "friends" | "close_friends" | "nobody";

export type MapFilterCategory =
  "all" | "friends" | "stories" | "online" | "trending";

export interface SocialMapMarkerData {
  id: string;
  friend: MapFriend;
  distanceKm?: number;
  relativeTime: string;
}

export interface MapClusterData {
  id: string;
  count: number;
  latitude: number;
  longitude: number;
  friends: MapFriend[];
}
