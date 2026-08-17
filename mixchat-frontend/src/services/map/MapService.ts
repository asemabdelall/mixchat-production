import { apiClient } from "../api/apiClient";
import type { operations, components } from "../api/types/api.generated";
import { MapFilterCategory } from "@/features/map/types/mapTypes";

export type LocationSettings =
  operations["MapController_getSettings_v1"]["responses"]["200"]["content"]["application/json"];

export type UpdateLocationSettingsInput =
  operations["MapController_updateSettings_v1"]["requestBody"]["content"]["application/json"];

export type UpdateLocationInput =
  operations["MapController_updateLocation_v1"]["requestBody"]["content"]["application/json"];

export type LocationUpdateResponse =
  operations["MapController_updateLocation_v1"]["responses"]["200"]["content"]["application/json"];

export type LocationDeleteResponse =
  operations["MapController_deleteLocation_v1"]["responses"]["200"]["content"]["application/json"];

export type MapFriend = components["schemas"]["MapFriendDto"];

export type MapFriendsResponse =
  operations["MapController_getFriendsLocations_v1"]["responses"]["200"]["content"]["application/json"];

export class MapService {
  /**
   * Fetch current location privacy and Ghost Mode settings
   */
  async getSettings(): Promise<LocationSettings> {
    return apiClient.get<LocationSettings>("/map/settings");
  }

  /**
   * Update location privacy settings (Ghost Mode, visibility)
   */
  async updateSettings(
    data: UpdateLocationSettingsInput,
  ): Promise<LocationSettings> {
    return apiClient.patch<LocationSettings>("/map/settings", data);
  }

  /**
   * Send live ephemeral location update to backend
   */
  async updateLocation(
    data: UpdateLocationInput,
  ): Promise<LocationUpdateResponse> {
    return apiClient.put<LocationUpdateResponse>("/map/location", data);
  }

  /**
   * Stop sharing and explicitly delete live coordinates
   */
  async deleteLocation(): Promise<LocationDeleteResponse> {
    return apiClient.delete<LocationDeleteResponse>("/map/location");
  }

  /**
   * Get active friend locations on map
   */
  async getFriendsLocations(): Promise<MapFriendsResponse> {
    return apiClient.get<MapFriendsResponse>("/map/friends");
  }

  /**
   * Filter friend markers by search query and category pill
   */
  filterFriends(
    friends: MapFriend[],
    category: MapFilterCategory,
    query: string,
    userLocation?: { latitude: number; longitude: number } | null,
  ): MapFriend[] {
    const trimmed = query.toLowerCase().trim();

    return friends.filter((friend) => {
      // Category filtering
      if (category === "stories" && !friend.hasActiveStory) return false;
      if (category === "online" && !friend.isOnline) return false;

      // Distance-based trending filter (<= 5km from user)
      if (category === "trending" && userLocation) {
        const dist = this.calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          friend.location.latitude,
          friend.location.longitude,
        );
        if (dist > 5.0) return false;
      }

      // Text search filter
      if (trimmed) {
        const matchesName = friend.user.displayName
          .toLowerCase()
          .includes(trimmed);
        const matchesUsername = friend.user.username
          .toLowerCase()
          .includes(trimmed);
        return matchesName || matchesUsername;
      }

      return true;
    });
  }

  /**
   * Haversine formula for calculating geodesic distance in kilometers
   */
  calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const mapService = new MapService();
