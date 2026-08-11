"use client";

import React from "react";
import Link from "next/link";
import { User as UserIcon, Phone, MessageSquare, Film, X, MapPin } from "lucide-react";
import { User } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { MapMarkerData } from "../types/mapTypes";

interface MapUserPreviewModalProps {
  marker: MapMarkerData | null;
  onClose: () => void;
  onStartChat: (userId: string) => void;
  onStartCall: (user: User) => void;
  onOpenStory?: (mediaUrl: string) => void;
}

export const MapUserPreviewModal: React.FC<MapUserPreviewModalProps> = ({
  marker,
  onClose,
  onStartChat,
  onStartCall,
  onOpenStory,
}) => {
  if (!marker) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-16 left-4 right-4 lg:bottom-6 lg:left-auto lg:right-6 lg:w-96 z-30 pointer-events-auto"
    >
      <div className="glass-panel p-4 rounded-3xl border border-purple-500/40 shadow-2xl space-y-4 bg-[#0d121f]/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Top User Info Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`relative ${marker.hasStory ? "story-ring-active p-0.5" : ""}`}>
              <Avatar
                src={marker.user.avatar}
                alt={marker.user.displayName}
                size="lg"
                online={marker.user.online}
                isVerified={marker.user.role === "verified"}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white truncate">{marker.user.displayName}</h3>
                <span className="text-[10px] text-purple-300 font-semibold bg-purple-500/20 px-2 py-0.5 rounded-full shrink-0">
                  {marker.distanceKm} km away
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">@{marker.user.username}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-purple-300/80 font-medium mt-1">
                <MapPin className="h-3 w-3 shrink-0 text-purple-400" />
                <span className="truncate">{marker.locationName}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close user preview"
            className="p-1 rounded-xl text-muted-foreground hover:text-white cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status Message & Context Tags */}
        <div className="glass-card p-3 rounded-2xl border border-white/10 text-xs space-y-1.5">
          <p className="text-white font-medium italic">&ldquo;{marker.statusMessage}&rdquo;</p>
          {marker.mutualFriendsCount ? (
            <p className="text-[11px] text-purple-300 font-semibold">
              👥 {marker.mutualFriendsCount} mutual friends on Mix Chat
            </p>
          ) : null}
          {marker.interestTags && marker.interestTags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {marker.interestTags.map((tag) => (
                <span key={tag} className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Link href={`/profile/${marker.user.username}`} className="w-full">
            <Button variant="glass" size="sm" className="w-full text-xs gap-1.5 font-bold">
              <UserIcon className="h-3.5 w-3.5 text-purple-300" />
              <span>Profile</span>
            </Button>
          </Link>

          <Button
            onClick={() => onStartCall(marker.user)}
            variant="glass"
            size="sm"
            className="w-full text-xs gap-1.5 text-purple-300 font-bold"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Call</span>
          </Button>

          <Button
            onClick={() => onStartChat(marker.user.id)}
            size="sm"
            className="w-full text-xs gap-1.5 font-bold"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Message</span>
          </Button>
        </div>

        {/* Optional Story Action Banner */}
        {marker.hasStory && onOpenStory && marker.storyMediaUrl && (
          <button
            type="button"
            onClick={() => onOpenStory(marker.storyMediaUrl!)}
            className="w-full py-2 px-3 rounded-xl gradient-bg-primary text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <Film className="h-4 w-4" />
            <span>Watch Active Story</span>
          </button>
        )}
      </div>
    </div>
  );
};
