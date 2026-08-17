"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { socketClient } from "@/services/api/socketClient";
import { healthService } from "@/services/health/healthService";

interface NetworkContextType {
  isOnline: boolean;
  isBackendReachable: boolean;
  wasOffline: boolean;
  checkReachability: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isBackendReachable: true,
  wasOffline: false,
  checkReachability: async () => true,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const [isBackendReachable, setIsBackendReachable] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  const checkReachability = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !navigator.onLine) {
      setIsBackendReachable(false);
      return false;
    }

    try {
      await healthService.getLiveness({ timeoutMs: 4000, skipAuthRefresh: true });
      setIsBackendReachable(true);
      return true;
    } catch {
      // Backend might be warming up or offline
      setIsBackendReachable(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let backOnlineTimeout: NodeJS.Timeout;

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);

      // Trigger socket reconnection
      try {
        socketClient.connect();
      } catch {
        // ignore
      }

      // Check backend reachability
      void checkReachability();

      // Dispatch global reconnected event for active feeds & views
      window.dispatchEvent(new CustomEvent("mixchat:reconnected"));

      // Clear the "wasOffline" banner after 4 seconds
      backOnlineTimeout = setTimeout(() => {
        setWasOffline(false);
      }, 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsBackendReachable(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (backOnlineTimeout) clearTimeout(backOnlineTimeout);
    };
  }, [checkReachability]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isBackendReachable,
        wasOffline,
        checkReachability,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetworkStatus = () => useContext(NetworkContext);
