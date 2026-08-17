import { apiClient } from "../api/apiClient";
import type { components } from "../api/types/api.generated";

export type PaginatedSocialUsersDto =
  components["schemas"]["PaginatedSocialUsersDto"];
export type SocialUserItemDto = components["schemas"]["SocialUserItemDto"];
export type PaginatedFollowRequestsDto =
  components["schemas"]["PaginatedFollowRequestsDto"];
export type FollowRequestItemDto =
  components["schemas"]["FollowRequestItemDto"];
export type RelationshipActionResponseDto =
  components["schemas"]["RelationshipActionResponseDto"];
export type SimpleMessageResponseDto =
  components["schemas"]["SimpleMessageResponseDto"];
export type AcceptFollowRequestResponseDto =
  components["schemas"]["AcceptFollowRequestResponseDto"];
export type RelationshipState =
  components["schemas"]["PublicProfileDto"]["relationshipState"];

export const socialService = {
  /**
   * Follow a user or send follow request if target is private
   */
  async followUser(userId: string): Promise<RelationshipActionResponseDto> {
    return apiClient.post<RelationshipActionResponseDto>(
      `/social/follow/${userId}`,
    );
  },

  /**
   * Unfollow a user or cancel pending follow request
   */
  async unfollowUser(userId: string): Promise<RelationshipActionResponseDto> {
    return apiClient.delete<RelationshipActionResponseDto>(
      `/social/follow/${userId}`,
    );
  },

  /**
   * Remove a follower from own profile
   */
  async removeFollower(followerId: string): Promise<SimpleMessageResponseDto> {
    return apiClient.delete<SimpleMessageResponseDto>(
      `/social/followers/${followerId}`,
    );
  },

  /**
   * List followers for a user with cursor pagination
   */
  async getFollowers(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedSocialUsersDto> {
    return apiClient.get<PaginatedSocialUsersDto>(
      `/social/users/${userId}/followers`,
      {
        params: { cursor, limit },
      },
    );
  },

  /**
   * List following for a user with cursor pagination
   */
  async getFollowing(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedSocialUsersDto> {
    return apiClient.get<PaginatedSocialUsersDto>(
      `/social/users/${userId}/following`,
      {
        params: { cursor, limit },
      },
    );
  },

  /**
   * List incoming follow requests
   */
  async getFollowRequests(
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedFollowRequestsDto> {
    return apiClient.get<PaginatedFollowRequestsDto>(
      "/social/follow-requests",
      {
        params: { cursor, limit },
      },
    );
  },

  /**
   * Accept incoming follow request
   */
  async acceptFollowRequest(
    requestId: string,
  ): Promise<AcceptFollowRequestResponseDto> {
    return apiClient.post<AcceptFollowRequestResponseDto>(
      `/social/follow-requests/${requestId}/accept`,
    );
  },

  /**
   * Decline incoming follow request
   */
  async declineFollowRequest(
    requestId: string,
  ): Promise<SimpleMessageResponseDto> {
    return apiClient.post<SimpleMessageResponseDto>(
      `/social/follow-requests/${requestId}/decline`,
    );
  },

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<SimpleMessageResponseDto> {
    return apiClient.post<SimpleMessageResponseDto>(`/social/block/${userId}`);
  },

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<SimpleMessageResponseDto> {
    return apiClient.delete<SimpleMessageResponseDto>(
      `/social/block/${userId}`,
    );
  },

  /**
   * List blocked users
   */
  async getBlockedUsers(
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedSocialUsersDto> {
    return apiClient.get<PaginatedSocialUsersDto>("/social/blocked", {
      params: { cursor, limit },
    });
  },

  /**
   * List close friends
   */
  async getCloseFriends(
    cursor?: string,
    limit = 20,
  ): Promise<PaginatedSocialUsersDto> {
    return apiClient.get<PaginatedSocialUsersDto>("/social/close-friends", {
      params: { cursor, limit },
    });
  },

  /**
   * Add a user to Close Friends
   */
  async addCloseFriend(userId: string): Promise<SimpleMessageResponseDto> {
    return apiClient.post<SimpleMessageResponseDto>(
      `/social/close-friends/${userId}`,
    );
  },

  /**
   * Remove a user from Close Friends
   */
  async removeCloseFriend(userId: string): Promise<SimpleMessageResponseDto> {
    return apiClient.delete<SimpleMessageResponseDto>(
      `/social/close-friends/${userId}`,
    );
  },
};

export default socialService;
