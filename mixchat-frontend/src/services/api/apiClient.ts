/**
 * MixChat Production API Client
 * Strongly typed HTTP client with normalized error envelopes, timeout handling,
 * in-memory access token storage, single-flight token refresh mutex, and HttpOnly cookie support.
 */

export interface ApiClientError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
  requestId?: string;
  timestamp?: string;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

export interface RequestConfig extends Omit<RequestInit, "body"> {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuthRefresh?: boolean;
  body?: unknown;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeoutMs: number;
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  private lastUserData: unknown = null;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    this.defaultTimeoutMs = 15000;
  }

  /**
   * Set in-memory access token
   */
  public setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  /**
   * Get in-memory access token
   */
  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Set persistent refresh token (cross-origin and mobile PWA fallback)
   */
  public setRefreshToken(token: string | null) {
    if (typeof window !== "undefined") {
      try {
        if (token) {
          localStorage.setItem("mixchat_refresh_token", token);
        } else {
          localStorage.removeItem("mixchat_refresh_token");
        }
      } catch {
        // Ignore localStorage quota/sandbox errors
      }
    }
  }

  /**
   * Get persistent refresh token
   */
  public getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("mixchat_refresh_token");
      } catch {
        return null;
      }
    }
    return null;
  }

  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.baseUrl}${cleanEndpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Single-flight token refresh mutex
   */
  private async executeSingleFlightRefresh(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const storedRefreshToken = this.getRefreshToken();
        const refreshUrl = `${this.baseUrl}/auth/refresh`;
        const res = await fetch(refreshUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(storedRefreshToken ? { "x-refresh-token": storedRefreshToken } : {}),
          },
          body: JSON.stringify({
            refreshToken: storedRefreshToken || undefined,
          }),
          credentials: "include",
        });

        if (!res.ok) {
          this.setAccessToken(null);
          this.setRefreshToken(null);
          this.lastUserData = null;
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("mixchat:unauthorized"));
          }
          return null;
        }

        const data = (await res.json()) as {
          accessToken?: string;
          refreshToken?: string;
          user?: unknown;
        };
        const newAccessToken = data.accessToken || null;
        this.setAccessToken(newAccessToken);
        if (data.refreshToken) {
          this.setRefreshToken(data.refreshToken);
        }
        this.lastUserData = data.user || null;
        return newAccessToken;
      } catch {
        this.setAccessToken(null);
        this.setRefreshToken(null);
        this.lastUserData = null;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("mixchat:unauthorized"));
        }
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Public refresh session method sharing the single-flight mutex
   */
  public async refreshSession(): Promise<{
    accessToken: string | null;
    user: unknown;
  }> {
    const token = await this.executeSingleFlightRefresh();
    return {
      accessToken: token,
      user: this.lastUserData,
    };
  }

  public async request<T>(
    endpoint: string,
    config: RequestConfig & { body?: unknown } = {},
    isRetry = false,
  ): Promise<T> {
    const {
      timeoutMs = this.defaultTimeoutMs,
      params,
      headers: customHeaders,
      signal: callerSignal,
      body,
      skipAuthRefresh = false,
      ...fetchOptions
    } = config;

    const url = this.buildUrl(endpoint, params);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (callerSignal) {
      callerSignal.addEventListener("abort", () => controller.abort());
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(customHeaders as Record<string, string>),
    };

    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    // Attach in-memory Bearer token
    if (this.accessToken && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: "include", // Includes HttpOnly refresh cookie
        signal: controller.signal,
        body:
          body !== undefined
            ? body instanceof FormData
              ? body
              : JSON.stringify(body)
            : undefined,
      });

      // Handle 401 Unauthorized with single-flight refresh retry
      const isAuthEndpoint =
        endpoint.includes("/auth/login") ||
        endpoint.includes("/auth/register") ||
        endpoint.includes("/auth/refresh");

      if (
        response.status === 401 &&
        !isRetry &&
        !skipAuthRefresh &&
        !isAuthEndpoint
      ) {
        clearTimeout(timeoutId);
        const refreshedToken = await this.executeSingleFlightRefresh();

        if (refreshedToken) {
          // Retry the original request once with the new access token
          return this.request<T>(endpoint, config, true);
        }
      }

      const responseRequestId =
        response.headers.get("x-request-id") || undefined;
      const contentType = response.headers.get("content-type") || "";
      let data: unknown = null;
      if (contentType.includes("application/json")) {
        data = await response.json().catch(() => null);
      } else {
        data = await response.text().catch(() => null);
      }

      if (!response.ok) {
        const errorPayload = data as { error?: Record<string, unknown> } | null;
        const normalizedError: ApiClientError = {
          code:
            (errorPayload?.error?.code as string) || `HTTP_${response.status}`,
          message:
            (errorPayload?.error?.message as string) ||
            response.statusText ||
            "Request failed",
          statusCode: response.status,
          details: errorPayload?.error?.details,
          requestId:
            (errorPayload?.error?.requestId as string) || responseRequestId,
          timestamp:
            (errorPayload?.error?.timestamp as string) ||
            new Date().toISOString(),
          isNetworkError: false,
          isTimeout: false,
        };

        throw normalizedError;
      }

      return data as T;
    } catch (err: unknown) {
      if ((err as ApiClientError)?.statusCode) {
        throw err;
      }

      const isAbort = err instanceof DOMException && err.name === "AbortError";

      const networkError: ApiClientError = {
        code: isAbort ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
        message: isAbort
          ? `Request timed out after ${timeoutMs}ms`
          : "Unable to connect to MixChat API. Check your network or backend status.",
        statusCode: isAbort ? 408 : 0,
        isNetworkError: !isAbort,
        isTimeout: isAbort,
        timestamp: new Date().toISOString(),
      };

      throw networkError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  public post<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "POST", body });
  }

  public put<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "PUT", body });
  }

  public patch<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "PATCH", body });
  }

  public delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
