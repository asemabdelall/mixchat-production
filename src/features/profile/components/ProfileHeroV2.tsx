"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, MapPin, Flame, Globe, Users, ExternalLink } from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Card } from "@/shared/components/ui/Card";
import { User } from "@/types";
import { ProfileActionBar } from "./ProfileActionBar";
import { MutualConnectionsModal } from "./MutualConnectionsModal";

interface ProfileHeroV2Props {
  isOwnProfile?: boolean;
  user: User;
  isFollowing: boolean;
  onToggleFollow: () => void;
  friendStatus: "none" | "requested" | "friends";
  onToggleFriendStatus: () => void;
  onStartChat: (userId: string) => void;
  onStartCall: (user: User) => void;
  onShareProfile: () => void;
  onOpenStory?: (mediaUrl: string) => void;
  hasStory?: boolean;
  storyMediaUrl?: string;
  mutualFriends?: User[];
}

export const ProfileHeroV2: React.FC<ProfileHeroV2Props> = ({
  isOwnProfile,
  user,
  isFollowing,
  onToggleFollow,
  friendStatus,
  onToggleFriendStatus,
  onStartChat,
  onStartCall,
  onShareProfile,
  onOpenStory,
  hasStory,
  storyMediaUrl,
  mutualFriends = [],
}) => {
  const [isMutualModalOpen, setIsMutualModalOpen] = useState(false);

  return (
    <Card className="glass-panel border-white/10 overflow-hidden relative p-0 shadow-2xl">
      {/* Cover Image Banner */}
      <div className="h-48 sm:h-60 w-full relative overflow-hidden bg-[#070a14]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.coverImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"}
          alt={`${user.displayName}'s Cover`}
          className="w-full h-full object-cover filter brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Profile Details Header Row */}
      <div className="px-6 pb-6 relative z-10 -mt-16 sm:-mt-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        {/* Avatar & Display Name */}
        <div className="flex items-end gap-4">
          <div
            onClick={() => {
              if (hasStory && onOpenStory && storyMediaUrl) {
                onOpenStory(storyMediaUrl);
              }
            }}
            className={`relative group ${hasStory ? "story-ring-active cursor-pointer p-0.5" : ""}`}
            title={hasStory ? "Watch Story" : undefined}
          >
            <Avatar
              src={user.avatar}
              alt={user.displayName}
              size="xl"
              online={user.online}
              isVerified={user.role === "verified"}
              className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-background shadow-2xl group-hover:scale-105 transition-transform"
            />
            {user.isPremium && (
              <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full gradient-bg-accent text-white shadow-md">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl sm:text-2xl text-white">{user.displayName}</h1>
              {user.isPremium && (
                <span className="flex items-center gap-1 text-[10px] font-bold gradient-bg-primary text-white px-2 py-0.5 rounded-full shadow-md">
                  PLUS VIP
                </span>
              )}
            </div>
            <p className="text-xs text-purple-300 font-semibold mt-0.5">@{user.username}</p>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <ProfileActionBar
          isOwnProfile={isOwnProfile}
          targetUser={user}
          isFollowing={isFollowing}
          onToggleFollow={onToggleFollow}
          friendStatus={friendStatus}
          onToggleFriendStatus={onToggleFriendStatus}
          onStartChat={onStartChat}
          onStartCall={onStartCall}
          onShareProfile={onShareProfile}
        />
      </div>

      {/* Bio, Status & Social Context */}
      <div className="px-6 pb-6 space-y-4">
        {/* Bio Text */}
        {user.bio && (
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed max-w-xl">
            {user.bio}
          </p>
        )}

        {/* Location, Streak & Website Link Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-purple-400" />
            <span>{user.location?.city || "San Francisco, CA"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span className="font-bold text-orange-400">14 Day Mix Streak</span>
          </div>

          <a
            href="https://mixchat.app"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-purple-300 hover:underline font-medium"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>mixchat.app/{user.username}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Mutual Connections Preview Badge (for other profiles) */}
        {!isOwnProfile && mutualFriends.length > 0 && (
          <button
            type="button"
            onClick={() => setIsMutualModalOpen(true)}
            className="glass-card px-3.5 py-2 rounded-2xl border border-white/10 flex items-center gap-2.5 hover:border-purple-500/40 transition-colors cursor-pointer text-xs"
          >
            <Users className="h-4 w-4 text-purple-400 shrink-0" />
            <span className="text-muted-foreground">
              Connected via <span className="font-bold text-white">{mutualFriends[0].displayName}</span>
              {mutualFriends.length > 1 ? ` and ${mutualFriends.length - 1} others` : ""}
            </span>
          </button>
        )}

        {/* Social Stats Counters */}
        <div className="flex items-center gap-6 pt-3 border-t border-white/10 text-xs">
          <Link href={isOwnProfile ? "/profile/followers" : `/profile/${user.username}/followers`} className="group hover:opacity-80 transition-opacity">
            <span className="font-extrabold text-sm text-white group-hover:text-purple-300 mr-1">
              {user.followersCount.toLocaleString()}
            </span>
            <span className="text-muted-foreground">Followers</span>
          </Link>

          <Link href={isOwnProfile ? "/profile/following" : `/profile/${user.username}/following`} className="group hover:opacity-80 transition-opacity">
            <span className="font-extrabold text-sm text-white group-hover:text-purple-300 mr-1">
              {user.followingCount.toLocaleString()}
            </span>
            <span className="text-muted-foreground">Following</span>
          </Link>

          <Link href="/friends" className="group hover:opacity-80 transition-opacity">
            <span className="font-extrabold text-sm text-white group-hover:text-purple-300 mr-1">142</span>
            <span className="text-muted-foreground">Friends</span>
          </Link>
        </div>
      </div>

      {/* Mutual Connections Modal */}
      {!isOwnProfile && (
        <MutualConnectionsModal
          isOpen={isMutualModalOpen}
          onClose={() => setIsMutualModalOpen(false)}
          targetUser={user}
          mutualUsers={mutualFriends}
          onStartChat={onStartChat}
        />
      )}
    </Card>
  );
};
