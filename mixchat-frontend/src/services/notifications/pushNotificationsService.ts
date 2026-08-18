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

function subscriptionUsesKey(
  subscription: PushSubscription,
  expectedKey: Uint8Array,
): boolean {
  const currentKey = subscription.options.applicationServerKey;

  // Older browser implementations may not expose the key. In that case the
  // subscription is still re-registered server-side without destructive churn.
  if (!currentKey) return true;

  const currentBytes = new Uint8Array(currentKey);
  if (currentBytes.length !== expectedKey.length) return false;

  return currentBytes.every((byte, index) => byte === expectedKey[index]);
}

async function getReadyServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  const registration =
    existing ||
    (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));

  if (registration.active) return registration;

  return navigator.serviceWorker.ready;
}

async function registerSubscription(
  subscription: PushSubscription,
): Promise<void> {
  const subJson = subscription.toJSON();
  if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
    throw new Error("Invalid push subscription structure returned by browser");
  }

  await apiClient.post("/push/subscriptions", {
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    },
    userAgent: navigator.userAgent,
  });
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

  /** Get the canonical VAPID public key from the signing backend. */
  async getVapidPublicKey(): Promise<string> {
    const res = await apiClient.get<{ publicKey: string }>(
      "/push/vapid-public-key",
    );
    return res.publicKey;
  },

  /**
   * Get active browser PushSubscription
   */
  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) return null;
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
      const reg = await getReadyServiceWorker();

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

      await registerSubscription(subscription);

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
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) return true;
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
  async syncSubscription(): Promise<boolean> {
    if (!this.isPushSupported() || this.getPermissionState() !== "granted") {
      return false;
    }

    try {
      const publicKey = await this.getVapidPublicKey();
      if (!publicKey) return false;

      const expectedKey = urlBase64ToUint8Array(publicKey);
      const registration = await getReadyServiceWorker();
      let subscription = await registration.pushManager.getSubscription();

      // Production origins persist subscriptions across deployments. Recreate
      // one that was issued for a previous VAPID key after key rotation.
      if (subscription && !subscriptionUsesKey(subscription, expectedKey)) {
        await subscription.unsubscribe();
        subscription = null;
      }

      if (!subscription) {
        const applicationServerKey = new Uint8Array(expectedKey.length);
        applicationServerKey.set(expectedKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      await registerSubscription(subscription);
      return true;
    } catch {
      // Startup reconciliation is best effort and retried on the next session.
      return false;
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
