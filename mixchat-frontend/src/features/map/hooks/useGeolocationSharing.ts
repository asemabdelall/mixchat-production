"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { mapService } from "@/services/map/MapService";

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export type GeolocationPermissionState =
  "prompt" | "granted" | "denied" | "unsupported";

interface UseGeolocationSharingOptions {
  isGhostMode?: boolean;
  minDistanceMeters?: number; // Minimum distance delta before sending an update
  minIntervalMs?: number; // Minimum time interval before sending an update
  onLocationUpdate?: (coords: UserCoordinates) => void;
}

export function useGeolocationSharing({
  isGhostMode = false,
  minDistanceMeters = 15,
  minIntervalMs = 15000,
  onLocationUpdate,
}: UseGeolocationSharingOptions = {}) {
  const [userCoords, setUserCoords] = useState<UserCoordinates | null>(null);
  const [permissionState, setPermissionState] =
    useState<GeolocationPermissionState>(() => {
      if (typeof window !== "undefined" && !navigator.geolocation) {
        return "unsupported";
      }
      return "prompt";
    });
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastUploadTimeRef = useRef<number>(0);
  const lastUploadCoordsRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Check initial permission status if available in modern browsers
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          setPermissionState(result.state as GeolocationPermissionState);
          result.onchange = () => {
            setPermissionState(result.state as GeolocationPermissionState);
          };
        })
        .catch(() => {
          // Fallback to prompt
        });
    }
  }, []);

  /**
   * Helper: calculate geodesic distance in meters
   */
  const calculateDistanceMeters = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371000; // Earth radius in meters
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [],
  );

  /**
   * Safe upload coordinates with client-side throttling and Ghost Mode assertion
   */
  const handlePosition = useCallback(
    async (position: GeolocationPosition, forceUpload = false) => {
      const coords: UserCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      };

      setUserCoords(coords);
      setError(null);
      if (onLocationUpdate) onLocationUpdate(coords);

      // If Ghost Mode is active, do not transmit coordinates
      if (isGhostMode) {
        return;
      }

      const now = Date.now();
      const timeElapsed = now - lastUploadTimeRef.current;

      let distanceMoved = Infinity;
      if (lastUploadCoordsRef.current) {
        distanceMoved = calculateDistanceMeters(
          lastUploadCoordsRef.current.latitude,
          lastUploadCoordsRef.current.longitude,
          coords.latitude,
          coords.longitude,
        );
      }

      // Check throttling threshold (time interval OR distance moved)
      if (
        forceUpload ||
        timeElapsed >= minIntervalMs ||
        distanceMoved >= minDistanceMeters
      ) {
        lastUploadTimeRef.current = now;
        lastUploadCoordsRef.current = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };

        try {
          await mapService.updateLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading ?? undefined,
            speed: coords.speed ?? undefined,
          });
        } catch {
          // Swallow network error gracefully without crashing
        }
      }
    },
    [
      isGhostMode,
      minDistanceMeters,
      minIntervalMs,
      onLocationUpdate,
      calculateDistanceMeters,
    ],
  );

  /**
   * Start live GPS watching
   */
  const startTracking = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setPermissionState("unsupported");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // 1. Initial immediate fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermissionState("granted");
        setIsTracking(true);
        handlePosition(pos, true);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
          setError(
            "Location permission denied. Please allow location access to share.",
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Location information is currently unavailable.");
        } else if (err.code === err.TIMEOUT) {
          setError("Location request timed out.");
        } else {
          setError("An unknown error occurred while retrieving location.");
        }
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
      },
    );

    // 2. Continuous watch with battery-conscious settings
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setIsTracking(true);
        handlePosition(pos, false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
          setIsTracking(false);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      },
    );

    watchIdRef.current = id;
  }, [handlePosition]);

  /**
   * Stop tracking and clean up watchers
   */
  const stopTracking = useCallback(() => {
    if (
      watchIdRef.current !== null &&
      typeof window !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // If Ghost Mode is enabled while tracking, immediately clean Redis
  useEffect(() => {
    if (isGhostMode && isTracking) {
      mapService.deleteLocation().catch(() => {});
    }
  }, [isGhostMode, isTracking]);

  // Page Visibility API awareness: refresh on foreground
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        isTracking &&
        !isGhostMode
      ) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => handlePosition(pos, true),
            () => {},
            { maximumAge: 0, timeout: 8000 },
          );
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isTracking, isGhostMode, handlePosition]);

  return {
    userCoords,
    permissionState,
    isTracking,
    error,
    startTracking,
    stopTracking,
  };
}
