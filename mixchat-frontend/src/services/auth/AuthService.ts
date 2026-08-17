import { apiClient } from "../api/apiClient";
import type { components } from "../api/types/api.generated";

export type UserDto = components["schemas"]["UserDto"];
export type AuthResponseDto = components["schemas"]["AuthResponseDto"];
export type SessionResponseDto = components["schemas"]["SessionResponseDto"];
export type RegisterDto = components["schemas"]["RegisterDto"];
export type LoginDto = components["schemas"]["LoginDto"];

export const authService = {
  /**
   * Register a new user and store access token in memory
   */
  async register(data: RegisterDto): Promise<UserDto> {
    const res = await apiClient.post<AuthResponseDto>("/auth/register", data, {
      skipAuthRefresh: true,
    });
    apiClient.setAccessToken(res.accessToken);
    return res.user;
  },

  /**
   * Login with email or username and store access token in memory
   */
  async login(data: LoginDto): Promise<UserDto> {
    const res = await apiClient.post<AuthResponseDto>("/auth/login", data, {
      skipAuthRefresh: true,
    });
    apiClient.setAccessToken(res.accessToken);
    return res.user;
  },

  /**
   * Refresh session using HttpOnly cookie and restore access token in memory
   * Uses single-flight refresh mutex to prevent duplicate concurrent refresh requests
   */
  async refresh(): Promise<UserDto> {
    const result = await apiClient.refreshSession();
    if (!result.accessToken || !result.user) {
      throw new Error("Unauthorized or session expired");
    }
    return result.user as UserDto;
  },

  /**
   * Log out of current session and clear tokens
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout", {}, { skipAuthRefresh: true });
    } finally {
      apiClient.setAccessToken(null);
    }
  },

  /**
   * Log out of all active sessions
   */
  async logoutAll(): Promise<void> {
    try {
      await apiClient.post("/auth/logout-all", {});
    } finally {
      apiClient.setAccessToken(null);
    }
  },

  /**
   * Fetch current authenticated user
   */
  async getMe(): Promise<UserDto> {
    return apiClient.get<UserDto>("/auth/me");
  },

  /**
   * List active sessions for account security
   */
  async getSessions(): Promise<SessionResponseDto[]> {
    return apiClient.get<SessionResponseDto[]>("/auth/sessions");
  },

  /**
   * Revoke a specific session
   */
  async revokeSession(id: string): Promise<void> {
    return apiClient.delete(`/auth/sessions/${id}`);
  },
};

export default authService;
