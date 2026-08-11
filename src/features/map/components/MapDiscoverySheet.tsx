"use client";

import React, { useState } from "react";
import { 
  Users, 
  Sparkles, 
  MessageSquare, 
  Phone, 
  ChevronUp,
  ChevronDown,
  Compass,
  MapPin,
  Film
} from "lucide-react";
import { User } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Card } from "@/shared/components/ui/Card";
import { MapMarkerData, MapFilterCategory } from "../types/mapTypes";

interface MapDiscoverySheetProps {
  markers: MapMarkerData[];
  selectedMarkerId?: string;
  onSelectMarker: (marker: MapMarkerData) => void;
  onStartChat: (userId: string) => void;
  onStartCall: (user: User) => void;
  onOpenStory?: (storyMediaUrl: string) => void;
  activeFilter: MapFilterCategory;
  onFilterChange: (filter: MapFilterCategory) => void;
}

export const MapDiscoverySheet: React.FC<MapDiscoverySheetProps> = ({
  markers,
  selectedMarkerId,
  onSelectMarker,
  onStartChat,
  onStartCall,
  onOpenStory,
  activeFilter,
  onFilterChange,
}) => {
  const [sheetState, setSheetState] = useState<"collapsed" | "half" | "expanded">("half");
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);

  const interestTags = ["☕ Coffee", "💻 Tech", "🎮 Gaming", "🎧 Music", "🎨 Art"];

  const filteredMarkers = markers.filter((m) => {
    if (activeFilter === "friends" && !m.user.isFollowing) return false;
    if (activeFilter === "stories" && !m.hasStory) return false;
    if (activeFilter === "online" && !m.user.online) return false;
    if (selectedInterest && !m.interestTags?.some((t) => t.includes(selectedInterest.replace(/[^a-zA-Z]/g, "")))) return false;
    return true;
  });

  const toggleSheetState = () => {
    if (sheetState === "collapsed") setSheetState("half");
    else if (sheetState === "half") setSheetState("expanded");
    else setSheetState("collapsed");
  };

  return (
    <div
      className={`glass-panel border-white/10 shadow-2xl transition-all duration-300 flex flex-col z-20 ${
        // Responsive behavior: Mobile Bottom Sheet vs Desktop Floating Sidebar
        "fixed bottom-16 left-0 right-0 lg:absolute lg:top-4 lg:bottom-4 lg:left-4 lg:right-auto lg:w-96 lg:rounded-3xl"
      } ${
        sheetState === "collapsed"
          ? "h-14 rounded-t-3xl overflow-hidden"
          : sheetState === "half"
          ? "h-[50vh] lg:h-auto rounded-t-3xl lg:rounded-3xl overflow-hidden"
          : "h-[80vh] lg:h-auto rounded-t-3xl lg:rounded-3xl overflow-hidden"
      }`}
    >
      {/* Mobile Drag Handle & Header */}
      <div
        onClick={toggleSheetState}
        className="p-3 border-b border-white/10 flex items-center justify-between cursor-pointer select-none bg-white/5 backdrop-blur-md shrink-0"
      >
        <div className="flex items-center gap-2.5">
          <Compass className="h-4 w-4 text-purple-400" />
          <span className="font-bold text-xs text-white">Social Discovery ({filteredMarkers.length})</span>
          <span className="text-[10px] text-purple-300 font-semibold px-2 py-0.5 rounded-full bg-purple-500/20">
            Live
          </span>
        </div>

        <button aria-label="Toggle discovery sheet height" className="text-muted-foreground hover:text-white p-1">
          {sheetState === "collapsed" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Sheet Content (visible when not collapsed) */}
      {sheetState !== "collapsed" && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {[
              { id: "all", label: "All Nearby", icon: <Compass className="h-3.5 w-3.5" /> },
              { id: "friends", label: "Friends", icon: <Users className="h-3.5 w-3.5" /> },
              { id: "stories", label: "Stories", icon: <Film className="h-3.5 w-3.5" /> },
              { id: "online", label: "Online", icon: <Sparkles className="h-3.5 w-3.5" /> },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onFilterChange(tab.id as MapFilterCategory)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "gradient-bg-primary text-white shadow-md shadow-purple-500/30"
                      : "glass-card text-muted-foreground hover:text-white border-white/10"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interest Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {interestTags.map((tag) => {
              const isSelected = selectedInterest === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedInterest(isSelected ? null : tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                    isSelected
                      ? "bg-purple-500/30 text-purple-200 border-purple-500/50"
                      : "bg-white/5 text-muted-foreground border-white/10 hover:text-white"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Nearby User Cards List */}
          <div className="space-y-2.5">
            {filteredMarkers.length > 0 ? (
              filteredMarkers.map((marker) => {
                const isSelected = selectedMarkerId === marker.id;
                return (
                  <Card
                    key={marker.id}
                    onClick={() => onSelectMarker(marker)}
                    className={`p-3 border transition-all cursor-pointer ${
                      isSelected
                        ? "glass-panel border-purple-500/50 shadow-lg shadow-purple-500/10"
                        : "glass-card border-white/10 hover:border-purple-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`relative ${marker.hasStory ? "story-ring-active p-0.5" : ""}`}>
                          <Avatar
                            src={marker.user.avatar}
                            alt={marker.user.displayName}
                            size="md"
                            online={marker.user.online}
                            isVerified={marker.user.role === "verified"}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-white truncate">{marker.user.displayName}</h4>
                            <span className="text-[10px] text-purple-300 font-semibold bg-purple-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                              {marker.distanceKm} km
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">@{marker.user.username}</p>

                          {marker.mutualFriendsCount ? (
                            <p className="text-[10px] text-purple-300/80 font-medium truncate mt-0.5">
                              👥 {marker.mutualFriendsCount} mutual friends
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {marker.hasStory && onOpenStory && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (marker.storyMediaUrl) onOpenStory(marker.storyMediaUrl);
                            }}
                            className="p-1.5 rounded-xl glass-card text-purple-300 hover:bg-purple-500/20 border border-white/10 transition-colors"
                            title="View Story"
                          >
                            <Film className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartCall(marker.user);
                          }}
                          className="p-1.5 rounded-xl glass-card text-purple-300 hover:bg-purple-500/20 border border-white/10 transition-colors"
                          title="Call"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartChat(marker.user.id);
                          }}
                          className="p-1.5 rounded-xl gradient-bg-primary text-white shadow-sm hover:scale-105 transition-transform"
                          title="Message"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8 glass-panel rounded-2xl border border-white/10 space-y-2">
                <MapPin className="h-8 w-8 text-purple-400 mx-auto opacity-40" />
                <p className="text-xs font-bold text-white">No people found</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Try adjusting your filter or zooming out on the map.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
