import { apiClient } from "@/services/api/apiClient";
import type { components } from "@/services/api/types/api.generated";

export type NotificationPreferencesDto =
  components["schemas"]["NotificationPreferencesDto"];
export type UpdateNotificationPreferencesDto =
  components["schemas"]["UpdateNotificationPreferencesDto"];

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushNotificationsService = {
  /**
   * Check if Push API and Service Workers are supported in the current browser
   */
  isPushSupported(): boolean {
    if (typeof window === "undefined") return false;
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  },

  /**
   * Get current browser notification permission
   */
  getPermissionState(): NotificationPermission {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    return Notification.permission;
  },

  /**
   * Get VAPID public key from environment or backend
   */
  async getVapidPublicKey(): Promise<string> {
    const envKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    if (envKey) return envKey;

    try {
      const res = await apiClient.get<{ publicKey: string }>(
        "/push/vapid-public-key",
      );
      return res.publicKey;
    } catch {
      return "";
    }
  },

  /**
   * Get active browser PushSubscription
   */
  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch {
      return null;
    }
  },

  /**
   * Request permission and subscribe browser to Web Push
   */
  async subscribe(): Promise<{
    success: boolean;
    permission: NotificationPermission;
  }> {
    if (!this.isPushSupported()) {
      return { success: false, permission: "denied" };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, permission };
    }

    try {
      const publicKey = await this.getVapidPublicKey();
      if (!publicKey) {
        throw new Error("VAPID public key is missing");
      }

      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      const applicationServerKey = new Uint8Array(convertedVapidKey.length);
      applicationServerKey.set(convertedVapidKey);
      const reg = await navigator.serviceWorker.ready;

      let subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        try {
          await subscription.unsubscribe();
        } catch {
          // ignore
        }
      }

      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error(
          "Invalid push subscription structure returned by browser",
        );
      }

      await apiClient.post("/push/subscriptions", {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });

      return { success: true, permission: "granted" };
    } catch {
      return { success: false, permission };
    }
  },

  /**
   * Send a test push notification to verify browser receipt
   */
  async sendTestPush(): Promise<{ success: boolean; delivered: number }> {
    return apiClient.post<{ success: boolean; delivered: number }>(
      "/push/test",
    );
  },

  /**
   * Unsubscribe browser from Web Push
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.isPushSupported()) return true;

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        try {
          await apiClient.delete("/push/subscriptions", {
            body: { endpoint },
          });
        } catch {
          // The server revokes unreachable endpoints after delivery failures.
        }

        await subscription.unsubscribe();
      }

      return true;
    } catch {
      return false;
    }
  },

  /**
   * Reconcile/sync existing browser subscription with authenticated session
   */
  async syncSubscription(): Promise<void> {
    if (!this.isPushSupported() || this.getPermissionState() !== "granted") {
      return;
    }

    try {
      const sub = await this.getExistingSubscription();
      if (!sub) return;

      const subJson = sub.toJSON();
      if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
        await apiClient.post("/push/subscriptions", {
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
          userAgent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        });
      }
    } catch {
      // Startup reconciliation is best effort and retried on the next session.
    }
  },

  /**
   * Get user notification preferences
   */
  async getPreferences(): Promise<NotificationPreferencesDto> {
    return apiClient.get<NotificationPreferencesDto>(
      "/notifications/preferences",
    );
  },

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    return apiClient.patch<NotificationPreferencesDto>(
      "/notifications/preferences",
      dto,
    );
  },
};
