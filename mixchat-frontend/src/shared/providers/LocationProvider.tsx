"use client";

import React, { createContext, useContext, useState } from "react";

export type LocationVisibilityMode =
  "ghost" | "approximate" | "friends" | "discoverable";

interface LocationContextType {
  visibilityMode: LocationVisibilityMode;
  setVisibilityMode: (mode: LocationVisibilityMode) => void;
  isGhostMode: boolean;
  toggleGhostMode: () => void;
  userLocationName: string;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "mixchat_location_visibility";

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visibilityMode, setVisibilityModeState] =
    useState<LocationVisibilityMode>(() => {
      if (typeof window === "undefined") return "approximate";
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (
          saved &&
          ["ghost", "approximate", "friends", "discoverable"].includes(saved)
        ) {
          return saved as LocationVisibilityMode;
        }
      } catch {
        // Fallback
      }
      return "approximate";
    });

  const setVisibilityMode = (mode: LocationVisibilityMode) => {
    setVisibilityModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage error
    }
  };

  const toggleGhostMode = () => {
    const nextMode: LocationVisibilityMode =
      visibilityMode === "ghost" ? "approximate" : "ghost";
    setVisibilityMode(nextMode);
  };

  const isGhostMode = visibilityMode === "ghost";

  return (
    <LocationContext.Provider
      value={{
        visibilityMode,
        setVisibilityMode,
        isGhostMode,
        toggleGhostMode,
        userLocationName: isGhostMode
          ? "Ghost Mode (Hidden)"
          : "San Francisco, CA (Approximate)",
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
};
