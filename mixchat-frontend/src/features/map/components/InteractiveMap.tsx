"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/providers/AuthProvider";
import { useChat } from "@/shared/providers/ChatProvider";
import { socketClient } from "@/services/api/socketClient";
import {
  mapService,
  type MapFriend,
  type LocationSettings,
} from "@/services/map/MapService";
import { useGeolocationSharing } from "../hooks/useGeolocationSharing";
import { MapFilterCategory } from "../types/mapTypes";
import { MapCanvas, type MapCanvasHandle } from "./MapCanvas";
import { MapControls } from "./MapControls";
import { MapFriendCard } from "./MapFriendCard";
import { MapPrivacySheet } from "./MapPrivacySheet";
import { AlertCircle, Loader2, Navigation, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

export const InteractiveMap: React.FC = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { startNewChat } = useChat();
  const mapCanvasRef = useRef<MapCanvasHandle>(null);

  // 1. Data state
  const [friends, setFriends] = useState<MapFriend[]>([]);
  const [settings, setSettings] = useState<LocationSettings>({
    isGhostMode: true,
    visibility: "FRIENDS",
    updatedAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [activeFilter, setActiveFilter] = useState<MapFilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFriend, setSelectedFriend] = useState<MapFriend | null>(null);
  const [isPrivacySheetOpen, setIsPrivacySheetOpen] = useState<boolean>(false);
  const [hasPromptedBanner, setHasPromptedBanner] = useState<boolean>(true);

  // 2. Geolocation Sharing Hook
  const {
    userCoords,
    permissionState,
    isTracking,
    startTracking,
    stopTracking,
  } = useGeolocationSharing({
    isGhostMode: settings.isGhostMode,
  });

  // 3. Load initial settings and friend locations
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const [fetchedSettings, fetchedFriends] = await Promise.all([
          mapService.getSettings(),
          mapService.getFriendsLocations(),
        ]);
        if (isMounted) {
          setSettings(fetchedSettings);
          setFriends(fetchedFriends.friends || []);

          if (!fetchedSettings.isGhostMode && permissionState === "granted") {
            startTracking();
          }
        }
      } catch (error: unknown) {
        if (isMounted) {
          setLoadError(
            (error as { message?: string }).message ||
              "Could not load map data.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [permissionState, reloadVersion, startTracking]);

  // 4. Listen for live Socket.IO location updates and removals
  useEffect(() => {
    const handleLocationUpdated = (updatedFriend: MapFriend) => {
      setFriends((prev) => {
        const index = prev.findIndex(
          (f) => f.user.id === updatedFriend.user.id,
        );
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedFriend;
          return next;
        }
        return [...prev, updatedFriend];
      });
    };

    const handleLocationRemoved = ({ userId }: { userId: string }) => {
      setFriends((prev) => prev.filter((f) => f.user.id !== userId));
      setSelectedFriend((prev) => (prev?.user.id === userId ? null : prev));
    };

    const unsubUpdated = socketClient.on<MapFriend>(
      "map:location_updated",
      handleLocationUpdated,
    );
    const unsubRemoved = socketClient.on<{ userId: string }>(
      "map:location_removed",
      handleLocationRemoved,
    );

    return () => {
      unsubUpdated();
      unsubRemoved();
    };
  }, []);

  // 5. Filter friends by search query and category
  const filteredFriends = useMemo(() => {
    return mapService.filterFriends(
      friends,
      activeFilter,
      searchQuery,
      userCoords,
    );
  }, [friends, activeFilter, searchQuery, userCoords]);

  // 6. Action Handlers
  const handleToggleGhostMode = async () => {
    const nextGhost = !settings.isGhostMode;
    try {
      const updated = await mapService.updateSettings({
        isGhostMode: nextGhost,
      });
      setSettings(updated);

      if (nextGhost) {
        stopTracking();
      } else {
        startTracking();
      }
    } catch {
      // Revert if failed
    }
  };

  const handleUpdatePrivacy = async (
    isGhost: boolean,
    visibility: "FRIENDS" | "CLOSE_FRIENDS" | "NOBODY",
  ) => {
    try {
      const updated = await mapService.updateSettings({
        isGhostMode: isGhost,
        visibility,
      });
      setSettings(updated);
      setIsPrivacySheetOpen(false);

      if (isGhost || visibility === "NOBODY") {
        stopTracking();
      } else {
        startTracking();
      }
    } catch {
      // Handle error
    }
  };

  const handleStartSharingPermission = () => {
    setHasPromptedBanner(false);
    startTracking();
    if (settings.isGhostMode) {
      handleToggleGhostMode();
    }
  };

  const handleSelectFriend = (friend: MapFriend) => {
    setSelectedFriend(friend);
    mapCanvasRef.current?.flyToFriend(friend);
  };

  const handleRecenter = () => {
    if (!isTracking && permissionState === "prompt") {
      startTracking();
    } else {
      mapCanvasRef.current?.recenterOnUser();
    }
  };

  const handleStartChat = async (user: MapFriend["user"]) => {
    await startNewChat(user.id);
    router.push("/chat");
  };

  const handleWatchStory = () => {
    router.push("/stories");
  };

  return (
    <div className="relative h-[calc(var(--app-viewport-height)-10.5rem)] min-h-[420px] w-full md:h-[calc(var(--app-viewport-height)-7rem)] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#070913] select-none flex flex-col">
      {/* 1. Minimal Snapchat-Grade Floating Control Bar */}
      <MapControls
        isGhostMode={settings.isGhostMode}
        onToggleGhostMode={handleToggleGhostMode}
        onOpenPrivacySheet={() => setIsPrivacySheetOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRecenter={handleRecenter}
        onZoomIn={() => mapCanvasRef.current?.zoomIn()}
        onZoomOut={() => mapCanvasRef.current?.zoomOut()}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        isSharingLocation={!settings.isGhostMode && isTracking}
      />

      {/* 2. Interactive MapLibre GL Vector Map Canvas */}
      <MapCanvas
        ref={mapCanvasRef}
        friends={filteredFriends}
        selectedFriend={selectedFriend}
        onSelectFriend={handleSelectFriend}
        onClearSelection={() => setSelectedFriend(null)}
        userCoords={userCoords}
        isGhostMode={settings.isGhostMode}
        currentUser={currentUser}
      />

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#070913]/45 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full bg-[#0b0f19]/90 px-4 py-2 text-xs text-white">
            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            Loading map…
          </div>
        </div>
      )}

      {loadError && !isLoading && (
        <div className="absolute left-4 right-4 top-28 z-30 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-rose-500/30 bg-[#0b0f19]/95 p-3 text-xs text-rose-200 shadow-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{loadError}</span>
          <Button
            type="button"
            size="xs"
            variant="glass"
            onClick={() => setReloadVersion((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      )}

      {permissionState === "denied" && (
        <div className="absolute left-4 right-4 top-28 z-30 mx-auto max-w-sm rounded-2xl border border-amber-500/30 bg-[#0b0f19]/95 p-3 text-xs leading-5 text-amber-100 shadow-xl">
          Location access is blocked in this browser. You can still view shared
          locations, but recentering and sharing are unavailable.
        </div>
      )}

      {/* 3. Location Permission Education Banner (First-time user prompt) */}
      {permissionState === "prompt" && hasPromptedBanner && (
        <div className="absolute top-28 left-4 right-4 sm:left-auto sm:right-16 sm:max-w-sm z-30 pointer-events-auto animate-in slide-in-from-top-4 duration-300">
          <div className="rounded-3xl bg-[#0b0f19]/95 border border-purple-500/40 p-4 shadow-2xl backdrop-blur-xl space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-2xl bg-purple-500/20 text-purple-300 shrink-0">
                <Navigation className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-white">
                  Share Live Location
                </h4>
                <p className="text-xs text-white/70 leading-relaxed mt-0.5">
                  See where your friends are and share your ephemeral position
                  with friends. Coordinates expire after 10 minutes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleStartSharingPermission}
                className="flex-1 font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl h-9"
              >
                <span>Enable Sharing</span>
              </Button>
              <Button
                size="sm"
                variant="glass"
                onClick={() => setHasPromptedBanner(false)}
                className="rounded-xl h-9 text-xs text-white/60"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Ghost Mode Indicator Pill when Ghost Mode is active */}
      {settings.isGhostMode && (
        <div className="absolute bottom-20 sm:bottom-6 right-4 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsPrivacySheetOpen(true)}
            className="flex min-h-11 items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b0f19]/90 border border-purple-500/40 shadow-xl backdrop-blur-md text-xs font-bold text-purple-300 hover:bg-purple-900/30 transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
            <span>Ghost Mode Active (Hidden)</span>
          </button>
        </div>
      )}

      {/* 5. Snapchat Friend Drawer & Active Detail Card */}
      <MapFriendCard
        selectedFriend={selectedFriend}
        friends={filteredFriends}
        onSelectFriend={handleSelectFriend}
        onCloseSelection={() => setSelectedFriend(null)}
        onStartChat={handleStartChat}
        onWatchStory={handleWatchStory}
        userCoords={userCoords}
        calculateDistanceKm={mapService.calculateDistanceKm.bind(mapService)}
      />

      {/* 6. Location Privacy & Ghost Mode Modal Sheet */}
      <MapPrivacySheet
        isOpen={isPrivacySheetOpen}
        onClose={() => setIsPrivacySheetOpen(false)}
        isGhostMode={settings.isGhostMode}
        visibility={settings.visibility}
        onUpdatePrivacy={handleUpdatePrivacy}
        isLoading={isLoading}
      />
    </div>
  );
};
