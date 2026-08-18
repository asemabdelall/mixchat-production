"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import { socketClient } from "@/services/api/socketClient";
import { RealtimeEvents } from "@/services/api/realtimeEvents";
import {
  notificationsService,
  NotificationItemDto,
  NotificationFilter,
} from "@/services/notifications/notificationsService";
import {
  pushNotificationsService,
  NotificationPreferencesDto,
  UpdateNotificationPreferencesDto,
} from "@/services/notifications/pushNotificationsService";

interface NotificationsContextValue {
  notifications: NotificationItemDto[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  loadMore: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;

  // Web Push & Preferences
  isPushSupported: boolean;
  permissionState: NotificationPermission;
  isPushSubscribed: boolean;
  preferences: NotificationPreferencesDto | null;
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<boolean>;
  sendTestPush: () => Promise<boolean>;
  updatePreferences: (dto: UpdateNotificationPreferencesDto) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItemDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilterState] = useState<NotificationFilter>("ALL");
  const filterRef = useRef<NotificationFilter>("ALL");

  // Push & Preferences State
  const [isPushSupported, setIsPushSupported] = useState<boolean>(false);
  const [permissionState, setPermissionState] =
    useState<NotificationPermission>("default");
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [preferences, setPreferences] =
    useState<NotificationPreferencesDto | null>(null);
  const refreshNotifications = useCallback(
    async (overrideFilter?: NotificationFilter) => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      setError(null);
      const activeFilter = overrideFilter ?? filterRef.current;
      try {
        const res = await notificationsService.getNotifications({
          limit: 20,
          filter: activeFilter,
        });
        setNotifications(res.items);
        setNextCursor(res.nextCursor ?? null);
        setHasMore(res.hasMore);
        setUnreadCount(res.unreadCount);
      } catch {
        setError("Notifications could not be loaded. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated],
  );

  const setFilter = useCallback(
    (newFilter: NotificationFilter) => {
      filterRef.current = newFilter;
      setFilterState(newFilter);
      void refreshNotifications(newFilter);
    },
    [refreshNotifications],
  );

  const loadMore = useCallback(async () => {
    if (!isAuthenticated || !hasMore || !nextCursor || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationsService.getNotifications({
        cursor: nextCursor,
        limit: 20,
        filter: filterRef.current,
      });
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newItems = res.items.filter((n) => !existingIds.has(n.id));
        return [...prev, ...newItems];
      });
      setNextCursor(res.nextCursor ?? null);
      setHasMore(res.hasMore);
      setUnreadCount(res.unreadCount);
    } catch {
      setError("Earlier notifications could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, hasMore, nextCursor, isLoading]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const res = await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount(res.unreadCount);
    } catch {
      setError("The notification could not be marked as read.");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch {
      setError("Notifications could not be marked as read.");
    }
  }, []);

  // Web Push Methods
  const enablePush = useCallback(async (): Promise<boolean> => {
    const result = await pushNotificationsService.subscribe();
    setPermissionState(result.permission);
    setIsPushSubscribed(result.success);
    return result.success;
  }, []);

  const disablePush = useCallback(async (): Promise<boolean> => {
    const success = await pushNotificationsService.unsubscribe();
    if (success) {
      setIsPushSubscribed(false);
    }
    return success;
  }, []);

  const sendTestPush = useCallback(async (): Promise<boolean> => {
    try {
      const res = await pushNotificationsService.sendTestPush();
      return res.success;
    } catch {
      return false;
    }
  }, []);

  const updatePreferences = useCallback(
    async (dto: UpdateNotificationPreferencesDto): Promise<void> => {
      try {
        const updated = await pushNotificationsService.updatePreferences(dto);
        setPreferences(updated);
      } catch (err) {
        throw err;
      }
    },
    [],
  );

  // Initialize push support & check existing subscription
  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(async () => {
      if (!mounted || typeof window === "undefined") return;
      const supported = pushNotificationsService.isPushSupported();
      setIsPushSupported(supported);

      if (supported) {
        setPermissionState(pushNotificationsService.getPermissionState());
        const sub = await pushNotificationsService.getExistingSubscription();
        if (mounted) {
          setIsPushSubscribed(!!sub);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch on mount or when filter changes
  useEffect(() => {
    let mounted = true;
    if (isAuthenticated) {
      Promise.resolve().then(async () => {
        if (!mounted) return;
        await refreshNotifications();
        // Load preferences & sync existing push subscription
        try {
          const prefs = await pushNotificationsService.getPreferences();
          if (mounted) setPreferences(prefs);
          const pushIsActive = await pushNotificationsService.syncSubscription();
          if (mounted) setIsPushSubscribed(pushIsActive);
        } catch {
          // ignore
        }
      });
    } else {
      Promise.resolve().then(() => {
        if (!mounted) return;
        setNotifications((prev) => (prev.length > 0 ? [] : prev));
        setUnreadCount((prev) => (prev > 0 ? 0 : prev));
        setNextCursor(null);
        setHasMore(false);
        setPreferences(null);
        setError(null);
      });
    }
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, refreshNotifications]);

  // Realtime Socket.IO Listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. New incoming notification
    const unsubNewNotif = socketClient.on(
      RealtimeEvents.NOTIFICATION_NEW,
      (newNotif: NotificationItemDto) => {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        setUnreadCount((c) => c + 1);
      },
    );

    // 2. Unread count sync
    const unsubUnreadCount = socketClient.on(
      RealtimeEvents.NOTIFICATION_UNREAD_COUNT,
      (data: { unreadCount: number }) => {
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      },
    );

    return () => {
      unsubNewNotif();
      unsubUnreadCount();
    };
  }, [isAuthenticated]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        hasMore,
        filter,
        setFilter,
        loadMore,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        isPushSupported,
        permissionState,
        isPushSubscribed,
        preferences,
        enablePush,
        disablePush,
        sendTestPush,
        updatePreferences,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextValue => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return ctx;
};
