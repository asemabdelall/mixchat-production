"use client";

import React from "react";
import Link from "next/link";
import {
  MessageCircle,
  Sparkles,
  X,
  Check,
  User as UserIcon,
  Clock,
} from "lucide-react";
import type { MapFriend } from "@/services/map/MapService";
import { Avatar } from "@/shared/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/dateUtils";

interface MapFriendCardProps {
  selectedFriend?: MapFriend | null;
  friends: MapFriend[];
  onSelectFriend: (friend: MapFriend) => void;
  onCloseSelection: () => void;
  onStartChat: (user: MapFriend["user"]) => void;
  onWatchStory: (friend: MapFriend) => void;
  userCoords?: { latitude: number; longitude: number } | null;
  calculateDistanceKm: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => number;
}

export const MapFriendCard: React.FC<MapFriendCardProps> = ({
  selectedFriend,
  friends,
  onSelectFriend,
  onCloseSelection,
  onStartChat,
  onWatchStory,
  userCoords,
  calculateDistanceKm,
}) => {
  // 1. Single Friend Selected Detail Card
  if (selectedFriend) {
    const { user, location, hasActiveStory, isOnline } = selectedFriend;
    const distance = userCoords
      ? calculateDistanceKm(
          userCoords.latitude,
          userCoords.longitude,
          location.latitude,
          location.longitude,
        )
      : null;

    return (
      <div className="absolute left-3 right-3 sm:left-6 sm:right-auto sm:w-96 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 z-30 pointer-events-auto animate-in slide-in-from-bottom-5 duration-200">
        <div className="relative rounded-3xl bg-[#0b0f19]/95 border border-white/20 p-4 shadow-2xl backdrop-blur-xl space-y-3.5">
          {/* Dismiss Button */}
          <button
            onClick={onCloseSelection}
            aria-label="Close detail card"
            className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Top Profile Header */}
          <div className="flex items-center gap-3 pr-6">
            {/* Story Ring Avatar */}
            <button
              type="button"
              onClick={() => hasActiveStory && onWatchStory(selectedFriend)}
              disabled={!hasActiveStory}
              aria-label={hasActiveStory ? "Open stories" : undefined}
              className={`relative transition-transform ${
                hasActiveStory
                  ? "p-[2px] rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 hover:scale-105"
                  : "p-[2px] rounded-full bg-white/20"
              }`}
            >
              <div className="p-[2px] bg-[#0b0f19] rounded-full">
                <div className="w-13 h-13 rounded-full overflow-hidden">
                  <Avatar
                    src={
                      typeof user.avatarUrl === "string"
                        ? user.avatarUrl
                        : undefined
                    }
                    alt={String(user.displayName || user.username)}
                    size="lg"
                  />
                </div>
              </div>

              {hasActiveStory && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-white shadow-md">
                  <Sparkles className="h-2.5 w-2.5 text-pink-200" />
                </span>
              )}
            </button>

            {/* Name, Handle, Freshness & Distance */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-white truncate">
                  {user.displayName}
                </h3>
                {user.isVerified && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </span>
                )}
                {isOnline && (
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm"
                    title="Online"
                  />
                )}
              </div>

              <p className="text-xs text-white/50 truncate">@{user.username}</p>

              <div className="flex items-center gap-2 text-[11px] text-white/70 mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-purple-400 shrink-0" />
                  <span>{formatRelativeTime(location.updatedAt)}</span>
                </span>
                {distance !== null && (
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30 shrink-0">
                    {distance < 0.1 ? "Nearby" : `~${distance.toFixed(1)} km`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onStartChat(user)}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Chat</span>
            </button>

            <Link
              href={`/profile/${user.username}`}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs border border-white/15 transition-all"
            >
              <UserIcon className="h-4 w-4 text-purple-300" />
              <span>Profile</span>
            </Link>
          </div>

          {/* Watch Story CTA Banner if friend has active story */}
          {hasActiveStory && (
            <button
              onClick={() => onWatchStory(selectedFriend)}
              className="w-full flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 hover:from-pink-500/30 hover:to-blue-500/30 text-pink-300 font-bold text-xs border border-pink-500/30 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Watch Active Story</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Default Bottom Horizontal Friends Carousel (Snapchat Style)
  if (friends.length === 0) return null;

  return (
    <div className="absolute left-3 right-3 sm:left-4 sm:right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-5 z-25 pointer-events-none">
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1 pointer-events-auto">
        {friends.map((friend) => {
          const distance = userCoords
            ? calculateDistanceKm(
                userCoords.latitude,
                userCoords.longitude,
                friend.location.latitude,
                friend.location.longitude,
              )
            : null;

          return (
            <button
              type="button"
              key={friend.user.id}
              onClick={() => onSelectFriend(friend)}
              className="flex items-center gap-2.5 min-h-13 px-3.5 rounded-2xl bg-[#0b0f19]/90 hover:bg-[#0b0f19] active:scale-95 border border-white/15 hover:border-purple-500/50 backdrop-blur-md shadow-xl transition-all shrink-0 group"
            >
              {/* Mini Avatar with optional Story Ring */}
              <div className="relative">
                <div
                  className={`p-[1.5px] rounded-full ${
                    friend.hasActiveStory
                      ? "bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400"
                      : "bg-white/20"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#0b0f19]">
                    <Avatar
                      src={
                        typeof friend.user.avatarUrl === "string"
                          ? friend.user.avatarUrl
                          : undefined
                      }
                      alt={String(
                        friend.user.displayName || friend.user.username,
                      )}
                      size="sm"
                    />
                  </div>
                </div>
                {friend.isOnline && (
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-[#0b0f19]" />
                )}
              </div>

              {/* Name & Freshness / Distance */}
              <div className="text-left">
                <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate max-w-[100px]">
                  {friend.user.displayName.split(" ")[0] ||
                    friend.user.username}
                </div>
                <div className="text-[10px] text-white/50 font-medium">
                  {distance !== null
                    ? distance < 0.1
                      ? "Nearby"
                      : `~${distance.toFixed(1)} km`
                    : formatRelativeTime(friend.location.updatedAt)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
