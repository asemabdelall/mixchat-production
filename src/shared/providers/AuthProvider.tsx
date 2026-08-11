"use client";

import React, { createContext, useContext, useState } from "react";
import { User } from "@/types";
import { CURRENT_USER } from "@/shared/services/mockData";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(CURRENT_USER);

  const login = async (_email?: string) => {
    void _email;
    // Mock login delay
    await new Promise((res) => setTimeout(res, 300));
    setUser(CURRENT_USER);
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
