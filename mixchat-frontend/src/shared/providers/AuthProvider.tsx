"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  authService,
  UserDto,
  LoginDto,
  RegisterDto,
} from "@/services/auth/AuthService";
import { pushNotificationsService } from "@/services/notifications/pushNotificationsService";
import { offlineStorage } from "@/services/storage/offlineStorage";

export type AuthStatus =
  "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthContextType {
  user: UserDto | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginDto) => Promise<UserDto>;
  register: (data: RegisterDto) => Promise<UserDto>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<UserDto | null>;
  updateProfile: (updated: Partial<UserDto> & Record<string, unknown>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshUser = useCallback(async (): Promise<UserDto | null> => {
    try {
      const refreshedUser = await authService.refresh();
      setUser(refreshedUser);
      setStatus("authenticated");
      return refreshedUser;
    } catch {
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const restoredUser = await authService.refresh();
        if (isMounted) {
          setUser(restoredUser);
          setStatus("authenticated");
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    };

    void restoreSession();

    const handleUnauthorized = () => {
      if (isMounted) {
        setUser(null);
        setStatus("unauthenticated");
      }
    };

    window.addEventListener("mixchat:unauthorized", handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener("mixchat:unauthorized", handleUnauthorized);
    };
  }, []);

  const login = async (data: LoginDto): Promise<UserDto> => {
    try {
      const loggedUser = await authService.login(data);
      setUser(loggedUser);
      setStatus("authenticated");
      return loggedUser;
    } catch (error) {
      setUser(null);
      setStatus("unauthenticated");
      throw error;
    }
  };

  const register = async (data: RegisterDto): Promise<UserDto> => {
    try {
      const registeredUser = await authService.register(data);
      setUser(registeredUser);
      setStatus("authenticated");
      return registeredUser;
    } catch (error) {
      setUser(null);
      setStatus("unauthenticated");
      throw error;
    }
  };

  const logout = async () => {
    setStatus("loading");
    try {
      await pushNotificationsService.unsubscribe().catch(() => {});
      await authService.logout();
    } finally {
      offlineStorage.clearUserOfflineData(user?.id);
      setUser(null);
      setStatus("unauthenticated");
    }
  };

  const logoutAll = async () => {
    setStatus("loading");
    try {
      await pushNotificationsService.unsubscribe().catch(() => {});
      await authService.logoutAll();
    } finally {
      offlineStorage.clearUserOfflineData(user?.id);
      setUser(null);
      setStatus("unauthenticated");
    }
  };

  const updateProfile = (
    updated: Partial<UserDto> & Record<string, unknown>,
  ) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...updated,
      } as UserDto;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isLoading: status === "loading",
        isAuthenticated: status === "authenticated" && !!user,
        login,
        register,
        logout,
        logoutAll,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
