"use client";

import React from "react";
import {
  Search,
  Navigation,
  Plus,
  Minus,
  Ghost,
  X,
  Sparkles,
  Shield,
} from "lucide-react";
import { MapFilterCategory } from "../types/mapTypes";

interface MapControlsProps {
  isGhostMode: boolean;
  onToggleGhostMode: () => void;
  onOpenPrivacySheet: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRecenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  activeFilter: MapFilterCategory;
  onSelectFilter: (cat: MapFilterCategory) => void;
  isSharingLocation?: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  isGhostMode,
  onToggleGhostMode,
  onOpenPrivacySheet,
  searchQuery,
  onSearchChange,
  onRecenter,
  onZoomIn,
  onZoomOut,
  activeFilter,
  onSelectFilter,
  isSharingLocation = false,
}) => {
  return (
    <>
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-3 right-3 sm:left-4 sm:right-4 z-30 flex items-center justify-between gap-2.5 pointer-events-none">
        {/* Search Friends Pill */}
        <div className="relative flex-1 max-w-xs sm:max-w-sm pointer-events-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <input
            type="text"
            aria-label="Search friends on map"
            placeholder="Search friends on map..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 pl-9 pr-11 rounded-full bg-[#090c15]/85 backdrop-blur-md border border-white/15 text-xs text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 shadow-xl transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear map search"
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons: Ghost Mode & Privacy Settings */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Ghost Mode Quick Toggle Pill */}
          <button
            onClick={onToggleGhostMode}
            aria-pressed={isGhostMode}
            aria-label={isGhostMode ? "Disable Ghost Mode" : "Enable Ghost Mode"}
            className={`inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full text-xs font-bold backdrop-blur-md border shadow-xl transition-all active:scale-95 ${
              isGhostMode
                ? "bg-purple-600/90 text-white border-purple-400 shadow-purple-500/30"
                : "bg-[#090c15]/85 text-white/80 border-white/15 hover:border-purple-400 hover:text-white"
            }`}
            title="Toggle Ghost Mode"
          >
            <Ghost
              className={`h-4 w-4 ${isGhostMode ? "text-cyan-300" : "text-white/60"}`}
            />
            <span className="hidden xs:inline">
              {isGhostMode ? "Ghost ON" : "Ghost OFF"}
            </span>
          </button>

          {/* Privacy Settings Modal Button */}
          <button
            onClick={onOpenPrivacySheet}
            aria-label="Location privacy settings"
            className="h-11 w-11 flex items-center justify-center rounded-full bg-[#090c15]/85 border border-white/15 text-white/80 hover:text-white hover:border-purple-400 shadow-xl backdrop-blur-md active:scale-95 transition-all"
            title="Location Privacy Settings"
          >
            <Shield className="h-4 w-4 text-purple-400" />
          </button>
        </div>
      </div>

      {/* Filter Category Pills (Stories, Online, Friends, All, Trending) */}
      <div className="absolute top-16 left-3 right-3 sm:left-4 sm:right-4 z-25 flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-none py-1">
        {(
          [
            { id: "all", label: "All Friends" },
            { id: "stories", label: "📸 Stories", icon: Sparkles },
            { id: "online", label: "🟢 Online" },
            { id: "trending", label: "📍 Nearby (<5km)" },
          ] as const
        ).map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => onSelectFilter(filter.id)}
              aria-pressed={isActive}
              className={`pointer-events-auto shrink-0 min-h-11 px-3 rounded-full text-[11px] font-bold backdrop-blur-md border transition-all active:scale-95 shadow-md ${
                isActive
                  ? "bg-purple-600 text-white border-purple-400 shadow-purple-500/30"
                  : "bg-[#090c15]/75 text-white/70 border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Right Side Vertical Action Rail (Recenter + Zoom In + Zoom Out) */}
      <div className="absolute right-3 sm:right-4 top-28 z-30 flex flex-col items-center gap-2 pointer-events-auto">
        {/* Recenter on You */}
        <button
          onClick={onRecenter}
          aria-label="Recenter on your location"
          className={`h-11 w-11 flex items-center justify-center rounded-full bg-[#090c15]/85 border shadow-xl backdrop-blur-md active:scale-90 transition-all ${
            isSharingLocation
              ? "border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
              : "border-white/15 text-white/70 hover:text-white hover:border-white/30"
          }`}
          title="Recenter on my location"
        >
          <Navigation className="h-4 w-4" />
        </button>

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="h-11 w-11 flex items-center justify-center rounded-full bg-[#090c15]/85 border border-white/15 text-white shadow-xl backdrop-blur-md hover:bg-white/10 active:scale-90 transition-all"
          title="Zoom In"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="h-11 w-11 flex items-center justify-center rounded-full bg-[#090c15]/85 border border-white/15 text-white shadow-xl backdrop-blur-md hover:bg-white/10 active:scale-90 transition-all"
          title="Zoom Out"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
    </>
  );
};
