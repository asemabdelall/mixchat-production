"use client";

import React, { useState } from "react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { CURRENT_USER } from "@/shared/services/mockData";
import { MapMarkerData, MapClusterData, LocationVisibilityMode } from "../types/mapTypes";

interface MapCanvasProps {
  markers: MapMarkerData[];
  clusters: MapClusterData[];
  selectedMarkerId?: string;
  onSelectMarker: (marker: MapMarkerData) => void;
  onSelectCluster: (cluster: MapClusterData) => void;
  privacyMode: LocationVisibilityMode;
  onClearSelection?: () => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  markers,
  clusters,
  selectedMarkerId,
  onSelectMarker,
  onSelectCluster,
  privacyMode,
  onClearSelection,
}) => {
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => onClearSelection?.()}
      className="relative flex-1 w-full bg-[#070a14] overflow-hidden select-none cursor-grab active:cursor-grabbing flex items-center justify-center"
    >
      {/* Background Dark Vector Grid Canvas */}
      <div
        className="absolute inset-[-100%] w-[300%] h-[300%] pointer-events-none transition-transform duration-75"
        style={{
          transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0)`,
        }}
      >
        {/* Radial Map Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />

        {/* Vector Grid Pattern */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(#a855f7 1.2px, transparent 1.2px), radial-gradient(#3b82f6 1.2px, #070a14 1.2px)",
            backgroundSize: "48px 48px",
            backgroundPosition: "0 0, 24px 24px",
          }}
        />

        {/* Simulated Vector Street Lines (SVG Overlay) */}
        <svg className="absolute inset-0 w-full h-full stroke-purple-500/15 fill-none stroke-[1.5]">
          <path d="M 0,300 Q 600,200 1200,500 T 2400,800" strokeWidth="3" className="stroke-purple-500/30" />
          <path d="M 400,0 Q 500,700 800,1400" strokeWidth="2.5" className="stroke-cyan-500/20" />
          <path d="M 800,0 Q 900,800 1400,1600" strokeWidth="2" strokeDasharray="6 6" />
          <path d="M 200,600 C 600,400 1000,900 1600,600" strokeWidth="2" />
        </svg>

        {/* Map District Name Labels */}
        <div className="absolute top-[28%] left-[22%] text-[11px] font-extrabold tracking-widest text-purple-300/40 uppercase pointer-events-none">
          MARINA DISTRICT
        </div>
        <div className="absolute top-[48%] left-[50%] text-[12px] font-extrabold tracking-widest text-cyan-300/40 uppercase pointer-events-none">
          DOWNTOWN SF
        </div>
        <div className="absolute top-[68%] left-[35%] text-[11px] font-extrabold tracking-widest text-pink-300/40 uppercase pointer-events-none">
          MISSION DISTRICT
        </div>
        <div className="absolute top-[62%] left-[72%] text-[11px] font-extrabold tracking-widest text-purple-300/40 uppercase pointer-events-none">
          SOMA BAY
        </div>
      </div>

      {/* Map Markers Overlay Container (moves with pan) */}
      <div
        className="absolute inset-0 pointer-events-none transition-transform duration-75"
        style={{
          transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0)`,
        }}
      >
        {/* Current User Map Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto z-20">
          <div className="relative">
            <span className="absolute -inset-4 rounded-full animate-radar gradient-bg-primary opacity-40" />
            <Avatar src={CURRENT_USER.avatar} alt="You" size="lg" className="border-2 border-purple-500 shadow-2xl" />
          </div>
          <span className="mt-1 rounded-full bg-purple-600/90 backdrop-blur-md text-[10px] font-bold text-white px-2.5 py-0.5 shadow-lg border border-purple-400/40">
            {privacyMode === "ghost"
              ? "You (Ghost Mode)"
              : privacyMode === "approximate"
              ? "You (SF Downtown - 1km)"
              : "You (SF Downtown - Exact)"}
          </span>
        </div>

        {/* Map Friend Pins */}
        {markers.map((marker) => {
          const isSelected = selectedMarkerId === marker.id;

          return (
            <div
              key={marker.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectMarker(marker);
              }}
              style={{ top: marker.topPercent, left: marker.leftPercent }}
              className="absolute z-10 flex flex-col items-center pointer-events-auto cursor-pointer transition-transform hover:scale-110 -translate-x-1/2 -translate-y-1/2 group"
            >
              <div
                className={`relative transition-all ${
                  isSelected ? "scale-125 story-ring-active" : marker.hasStory ? "story-ring-active p-0.5" : ""
                }`}
              >
                <Avatar
                  src={marker.user.avatar}
                  alt={marker.user.displayName}
                  size="md"
                  online={marker.user.online}
                />
              </div>
              <div className="mt-1 rounded-xl glass-card px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md border border-white/10 shadow-lg text-center truncate max-w-[100px] group-hover:border-purple-400/60">
                {marker.user.displayName.split(" ")[0]}
              </div>
            </div>
          );
        })}

        {/* Map Clusters */}
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectCluster(cluster);
            }}
            style={{ top: cluster.topPercent, left: cluster.leftPercent }}
            className="absolute z-15 flex flex-col items-center pointer-events-auto cursor-pointer -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full gradient-bg-primary text-white font-extrabold text-xs shadow-xl border-2 border-white/30 animate-pulse">
              +{cluster.count}
            </div>
            <div className="mt-1 rounded-xl glass-card px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30 backdrop-blur-md shadow-md">
              {cluster.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
