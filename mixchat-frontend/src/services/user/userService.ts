import { apiClient } from "../api/apiClient";
import type { components } from "../api/types/api.generated";

export type UserDto = components["schemas"]["UserDto"];
export type PublicProfileDto = components["schemas"]["PublicProfileDto"];
export type UpdateProfileDto = components["schemas"]["UpdateProfileDto"];
export type PrivacySettingsDto = components["schemas"]["PrivacySettingsDto"];
export type UpdatePrivacyDto = components["schemas"]["UpdatePrivacyDto"];
export type SocialUserItemDto = components["schemas"]["SocialUserItemDto"];

export const userService = {
  /**
   * Fetch authenticated user's profile and stats
   */
  async getOwnProfile(): Promise<UserDto> {
    return apiClient.get<UserDto>("/users/me");
  },

  /**
   * Update own profile data
   */
  async updateOwnProfile(data: UpdateProfileDto): Promise<UserDto> {
    return apiClient.patch<UserDto>("/users/me", data);
  },

  /**
   * Fetch public profile for any user by username or ID
   */
  async getPublicProfile(usernameOrId: string): Promise<PublicProfileDto> {
    return apiClient.get<PublicProfileDto>(
      `/users/by-username/${encodeURIComponent(usernameOrId)}`,
    );
  },

  /**
   * Search users by username or display name
   */
  async searchUsers(query: string, limit = 20): Promise<SocialUserItemDto[]> {
    if (!query.trim()) return [];
    return apiClient.get<SocialUserItemDto[]>("/users/search", {
      params: { q: query, limit },
    });
  },

  /**
   * Get user privacy controls
   */
  async getPrivacySettings(): Promise<PrivacySettingsDto> {
    return apiClient.get<PrivacySettingsDto>("/users/me/privacy");
  },

  /**
   * Update user privacy controls
   */
  async updatePrivacySettings(
    data: UpdatePrivacyDto,
  ): Promise<PrivacySettingsDto> {
    return apiClient.patch<PrivacySettingsDto>("/users/me/privacy", data);
  },
};

export default userService;
