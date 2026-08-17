import { apiClient, type RequestConfig } from "../api/apiClient";
import type { components } from "../api/types/api.generated";

export type LivenessResponse = components["schemas"]["LivenessResponseDto"];
export type ReadinessResponse = components["schemas"]["ReadinessResponseDto"];

export const healthService = {
  /**
   * Check backend liveness
   */
  async getLiveness(config?: RequestConfig): Promise<LivenessResponse> {
    return apiClient.get<LivenessResponse>("/health", config);
  },

  /**
   * Check backend readiness (PostgreSQL + Redis)
   */
  async getReadiness(): Promise<ReadinessResponse> {
    return apiClient.get<ReadinessResponse>("/health/ready");
  },
};

export default healthService;
