"use client";

import React from "react";
import { Compass, Shield, Search, Map as MapIcon, List, RefreshCw } from "lucide-react";
import { LocationVisibilityMode } from "../types/mapTypes";

interface MapControlsProps {
  privacyMode: LocationVisibilityMode;
  onOpenPrivacySheet: () => void;
  viewMode: "map" | "list";
  onToggleViewMode: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchThisArea: () => void;
  isSearchingArea?: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  privacyMode,
  onOpenPrivacySheet,
  viewMode,
  onToggleViewMode,
  searchQuery,
  onSearchChange,
  onSearchThisArea,
  isSearchingArea,
}) => {
  const privacyPill =
    privacyMode === "ghost"
      ? { label: "Ghost Mode", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" }
      : privacyMode === "approximate"
      ? { label: "Approximate", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" }
      : { label: "Exact Location", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-3 pointer-events-none">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2">
        {/* Status Indicator */}
        <div className="glass-panel px-3.5 py-2 rounded-2xl flex items-center gap-2 pointer-events-auto border border-white/10 shadow-lg">
          <Compass className="h-4 w-4 text-purple-400 animate-spin" />
          <span className="font-bold text-xs text-white">Live Discovery Map</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping ml-0.5" />
        </div>

        {/* Action Controls Right Group */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Map vs List View Switcher */}
          <button
            type="button"
            onClick={onToggleViewMode}
            className="flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold glass-panel border border-white/10 hover:border-purple-500/40 text-white transition-all cursor-pointer shadow-lg"
            title="Toggle Map / List View"
          >
            {viewMode === "map" ? (
              <>
                <List className="h-4 w-4 text-purple-400" />
                <span className="hidden sm:inline">List View</span>
              </>
            ) : (
              <>
                <MapIcon className="h-4 w-4 text-purple-400" />
                <span className="hidden sm:inline">Map View</span>
              </>
            )}
          </button>

          {/* Privacy Quick Toggle Pill */}
          <button
            type="button"
            onClick={onOpenPrivacySheet}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-semibold backdrop-blur-md border transition-all cursor-pointer shadow-lg ${privacyPill.color}`}
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-none">{privacyPill.label}</span>
          </button>
        </div>
      </div>

      {/* Middle Row: Search & Search This Area Pill */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search map by name, username, or area..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl glass-card border border-white/10 text-xs text-white placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all shadow-md"
          />
        </div>

        <button
          type="button"
          onClick={onSearchThisArea}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold glass-panel border border-white/10 hover:border-purple-500/40 text-purple-300 transition-all cursor-pointer shadow-md shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSearchingArea ? "animate-spin" : ""}`} />
          <span>Search This Area</span>
        </button>
      </div>
    </div>
  );
};
