"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocation } from "@/shared/providers/LocationProvider";
import { useCall } from "@/shared/providers/CallProvider";
import { useChat } from "@/shared/providers/ChatProvider";
import { User } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";
import { MOCK_USERS, MOCK_STORIES } from "@/shared/services/mockData";
import { StoryViewerModal } from "@/features/stories/components/StoryViewerModal";

import { MapMarkerData, MapClusterData, MapFilterCategory, LocationVisibilityMode } from "../types/mapTypes";
import { MapCanvas } from "./MapCanvas";
import { MapControls } from "./MapControls";
import { MapDiscoverySheet } from "./MapDiscoverySheet";
import { MapPrivacySheet } from "./MapPrivacySheet";
import { MapUserPreviewModal } from "./MapUserPreviewModal";

export const InteractiveMap: React.FC = () => {
  const router = useRouter();
  const { visibilityMode, setVisibilityMode } = useLocation();
  const { startCall } = useCall();
  const { startNewChat } = useChat();

  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [activeFilter, setActiveFilter] = useState<MapFilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [isPrivacySheetOpen, setIsPrivacySheetOpen] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | undefined>(undefined);
  const [selectedStoryMediaUrl, setSelectedStoryMediaUrl] = useState<string | null>(null);

  // Escape key listener to clear map selection
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedMarkerId(undefined);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Initial enriched Map V2 markers dataset derived from mock users
  const rawMarkers: MapMarkerData[] = useMemo(
    () => [
      {
        id: "marker_1",
        user: MOCK_USERS[1], // Sophia Chen
        lat: 37.7833,
        lng: -122.4167,
        topPercent: "32%",
        leftPercent: "28%",
        distanceKm: 0.8,
        statusMessage: "Rendering 3D scenes 🎬 in Downtown SF",
        locationName: "San Francisco - Marina District",
        hasStory: true,
        storyMediaUrl: MOCK_STORIES[0]?.mediaUrl,
        mutualFriendsCount: 4,
        interestTags: ["🎨 Design", "☕ Coffee"],
        lastActive: "5m ago",
      },
      {
        id: "marker_2",
        user: MOCK_USERS[2], // Marcus Vance
        lat: 37.769,
        lng: -122.448,
        topPercent: "65%",
        leftPercent: "72%",
        distanceKm: 2.3,
        statusMessage: "Coffee time & coding synth engines ☕",
        locationName: "San Francisco - Mission District",
        hasStory: false,
        mutualFriendsCount: 2,
        interestTags: ["💻 Tech", "🎧 Music"],
        lastActive: "12m ago",
      },
      {
        id: "marker_3",
        user: MOCK_USERS[3], // Elena Rostova
        lat: 37.755,
        lng: -122.42,
        topPercent: "38%",
        leftPercent: "74%",
        distanceKm: 1.5,
        statusMessage: "In deep focus mode 🧠 building AI chat",
        locationName: "San Francisco - SoMa",
        hasStory: true,
        storyMediaUrl: MOCK_STORIES[1]?.mediaUrl,
        mutualFriendsCount: 6,
        interestTags: ["🎮 Gaming", "💻 Tech"],
        lastActive: "25m ago",
      },
      {
        id: "marker_4",
        user: MOCK_USERS[4], // David Kim
        lat: 37.791,
        lng: -122.405,
        topPercent: "75%",
        leftPercent: "25%",
        distanceKm: 3.1,
        statusMessage: "Jamming modular synthesizers in studio 🎧",
        locationName: "San Francisco - Nob Hill",
        hasStory: false,
        mutualFriendsCount: 1,
        interestTags: ["🎧 Music", "☕ Coffee"],
        lastActive: "1h ago",
      },
    ],
    []
  );

  // Density clusters for dense nearby regions
  const clusters: MapClusterData[] = useMemo(
    () => [
      {
        id: "cluster_soma",
        topPercent: "42%",
        leftPercent: "82%",
        count: 5,
        users: [MOCK_USERS[2], MOCK_USERS[3]],
        label: "SoMa Tech Hub (+5)",
      },
    ],
    []
  );

  // Filter markers based on search query
  const filteredMarkers = useMemo(() => {
    if (!searchQuery.trim()) return rawMarkers;
    const q = searchQuery.toLowerCase();
    return rawMarkers.filter(
      (m) =>
        m.user.displayName.toLowerCase().includes(q) ||
        m.user.username.toLowerCase().includes(q) ||
        m.locationName.toLowerCase().includes(q) ||
        m.statusMessage.toLowerCase().includes(q)
    );
  }, [rawMarkers, searchQuery]);

  const selectedMarker = useMemo(
    () => filteredMarkers.find((m) => m.id === selectedMarkerId) || filteredMarkers[0] || null,
    [filteredMarkers, selectedMarkerId]
  );

  const handleStartChat = (userId: string) => {
    const chatId = startNewChat(userId);
    if (chatId) {
      router.push("/chat");
    }
  };

  const handleStartCall = (user: User) => {
    startCall(user, "voice");
  };

  const handleSearchThisArea = () => {
    setIsSearchingArea(true);
    setTimeout(() => {
      setIsSearchingArea(false);
    }, 800);
  };

  const handleOpenStory = (storyMediaUrl: string) => {
    setSelectedStoryMediaUrl(storyMediaUrl);
  };

  return (
    <div className="relative w-full h-[calc(100vh-7.5rem)] rounded-3xl overflow-hidden border border-white/10 glass-panel shadow-2xl flex flex-col">
      {/* Floating Top Controls & Privacy Bar */}
      <MapControls
        privacyMode={visibilityMode}
        onOpenPrivacySheet={() => setIsPrivacySheetOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((prev) => (prev === "map" ? "list" : "map"))}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchThisArea={handleSearchThisArea}
        isSearchingArea={isSearchingArea}
      />

      {/* Main Content Area: Vector Map Canvas OR List View Fallback */}
      {viewMode === "map" ? (
        <MapCanvas
          markers={filteredMarkers}
          clusters={clusters}
          selectedMarkerId={selectedMarker?.id}
          onSelectMarker={(m) => setSelectedMarkerId(m.id)}
          onSelectCluster={(c) => {
            if (c.users[0]) {
              const matched = rawMarkers.find((m) => m.user.id === c.users[0].id);
              if (matched) setSelectedMarkerId(matched.id);
            }
          }}
          privacyMode={visibilityMode}
          onClearSelection={() => setSelectedMarkerId(undefined)}
        />
      ) : (
        <div className="flex-1 w-full bg-[#070a14] p-6 pt-24 overflow-y-auto custom-scrollbar">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-lg font-bold text-white mb-2">Nearby Discovery List ({filteredMarkers.length})</h2>
            {filteredMarkers.map((marker) => (
              <div
                key={marker.id}
                onClick={() => setSelectedMarkerId(marker.id)}
                className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4 hover:border-purple-500/40 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`relative ${marker.hasStory ? "story-ring-active p-0.5" : ""}`}>
                    <Avatar src={marker.user.avatar} alt={marker.user.displayName} size="md" online={marker.user.online} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{marker.user.displayName}</h4>
                    <p className="text-xs text-muted-foreground">@{marker.user.username} • {marker.locationName}</p>
                    <p className="text-xs text-purple-300 mt-0.5 font-medium">{marker.distanceKm} km away</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartChat(marker.user.id)}
                    className="px-3 py-1.5 rounded-xl gradient-bg-primary text-white text-xs font-bold shadow-md hover:scale-105 transition-transform"
                  >
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Selected User Card Preview */}
      {selectedMarker && viewMode === "map" && (
        <MapUserPreviewModal
          marker={selectedMarker}
          onClose={() => setSelectedMarkerId(undefined)}
          onStartChat={handleStartChat}
          onStartCall={handleStartCall}
          onOpenStory={handleOpenStory}
        />
      )}

      {/* Responsive Discovery Side Panel / Bottom Sheet */}
      <MapDiscoverySheet
        markers={filteredMarkers}
        selectedMarkerId={selectedMarker?.id}
        onSelectMarker={(m) => setSelectedMarkerId(m.id)}
        onStartChat={handleStartChat}
        onStartCall={handleStartCall}
        onOpenStory={handleOpenStory}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Location Privacy Modal Drawer */}
      <MapPrivacySheet
        isOpen={isPrivacySheetOpen}
        onClose={() => setIsPrivacySheetOpen(false)}
        currentMode={visibilityMode}
        onChangeMode={(m: LocationVisibilityMode) => {
          setVisibilityMode(m);
          setIsPrivacySheetOpen(false);
        }}
      />

      {/* Story Viewer Modal integration when story is opened from map pin */}
      {selectedStoryMediaUrl && (
        <StoryViewerModal
          story={{
            id: "story_map_1",
            userId: selectedMarker?.user.id || "u_2",
            user: selectedMarker?.user || MOCK_USERS[1],
            mediaUrl: selectedStoryMediaUrl,
            mediaType: "image",
            caption: "Live moment from San Francisco discovery map 📸",
            timestamp: "15m ago",
            duration: 5,
            viewsCount: 142,
          }}
          onClose={() => setSelectedStoryMediaUrl(null)}
        />
      )}
    </div>
  );
};
