"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  MapPin,
  Globe,
  Check,
  ExternalLink,
  Lock,
} from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { AvatarImage } from "@/shared/components/ui/AvatarImage";
import { ProfileActionBar } from "./ProfileActionBar";
import { RelationshipState } from "@/services/social/socialService";

export interface ProfileHeroData {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  website?: string | null;
  locationCity?: string | null;
  isPrivate: boolean;
  isVerified: boolean;
  isPremium: boolean;
  followersCount: number;
  followingCount: number;
  relationshipState?: RelationshipState;
  isCloseFriend?: boolean;
}

interface ProfileHeroV2Props {
  isOwnProfile?: boolean;
  user: ProfileHeroData;
  onFollow?: () => Promise<void>;
  onUnfollow?: () => Promise<void>;
  onToggleCloseFriend?: () => Promise<void>;
  onBlock?: () => Promise<void>;
  onUnblock?: () => Promise<void>;
  onStartChat: (userId: string) => void;
  onShareProfile: () => void;
  onOpenStory?: (mediaUrl: string) => void;
  hasStory?: boolean;
  storyMediaUrl?: string;
}

export const ProfileHeroV2: React.FC<ProfileHeroV2Props> = ({
  isOwnProfile,
  user,
  onFollow,
  onUnfollow,
  onToggleCloseFriend,
  onBlock,
  onUnblock,
  onStartChat,
  onShareProfile,
  onOpenStory,
  hasStory,
  storyMediaUrl,
}) => {
  const followersHref = isOwnProfile
    ? "/profile/followers"
    : `/profile/${user.username}/followers`;
  const followingHref = isOwnProfile
    ? "/profile/following"
    : `/profile/${user.username}/following`;

  return (
    <Card className="glass-panel border-white/10 overflow-hidden relative p-0 rounded-3xl shadow-2xl bg-[#090c17]">
      {/* Cover Image Banner */}
      <div className="h-44 sm:h-56 w-full relative overflow-hidden bg-[#070a14]">
        {user.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.coverUrl}
            alt={`${user.displayName}'s cover`}
            className="h-full w-full object-cover brightness-95"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-purple-950/70 via-slate-900 to-indigo-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090c17] via-[#090c17]/40 to-transparent" />
      </div>

      {/* Profile Details Header Row */}
      <div className="px-5 sm:px-6 pb-6 relative z-10 -mt-16 sm:-mt-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        {/* Avatar & Display Name */}
        <div className="flex items-end gap-4">
          {/* Avatar with Story Ring */}
          <button
            type="button"
            onClick={() => {
              if (hasStory && onOpenStory && storyMediaUrl) {
                onOpenStory(storyMediaUrl);
              }
            }}
            disabled={!hasStory || !onOpenStory || !storyMediaUrl}
            aria-label={hasStory ? `Watch ${user.displayName}'s story` : undefined}
            className={`relative rounded-full transition-transform duration-200 ${
              hasStory
                ? "cursor-pointer p-[3px] bg-gradient-to-tr from-[#f59e0b] via-[#ec4899] via-[#8b5cf6] to-[#06b6d4] shadow-xl shadow-purple-500/30 hover:scale-105 active:scale-95"
                : "p-[3px] bg-white/20"
            }`}
            title={hasStory ? "Watch Active Story" : undefined}
          >
            {/* Dark Isolation Ring Gap */}
            <div className="p-[3px] bg-[#090c17] rounded-full">
              <div className="w-22 h-22 sm:w-26 sm:h-26 rounded-full overflow-hidden bg-white/5 relative">
                <AvatarImage
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </button>

          {/* User Name & Handle */}
          <div className="mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                {user.displayName || user.username}
              </h1>
              {user.isVerified && (
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] shadow-md"
                  title="Verified Creator"
                >
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
              )}
              {user.isPremium && (
                <span className="flex items-center gap-1 text-[10px] font-black gradient-bg-primary text-white px-2.5 py-0.5 rounded-full shadow-md border border-purple-400/40">
                  <Sparkles className="h-2.5 w-2.5 text-pink-200" />
                  <span>PLUS</span>
                </span>
              )}
              {user.isPrivate && (
                <span
                  className="flex items-center gap-1 text-[10px] font-bold bg-white/10 text-slate-300 px-2 py-0.5 rounded-full"
                  title="Private Account"
                >
                  <Lock className="h-2.5 w-2.5 text-slate-400" />
                  <span>Private</span>
                </span>
              )}
            </div>
            <p className="text-xs text-purple-300 font-semibold mt-0.5">
              @{user.username}
            </p>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <ProfileActionBar
          isOwnProfile={isOwnProfile}
          targetUser={user}
          relationshipState={user.relationshipState}
          isCloseFriend={user.isCloseFriend}
          onFollow={onFollow}
          onUnfollow={onUnfollow}
          onToggleCloseFriend={onToggleCloseFriend}
          onBlock={onBlock}
          onUnblock={onUnblock}
          onStartChat={onStartChat}
          onShareProfile={onShareProfile}
        />
      </div>

      {/* Bio, Status & Social Context */}
      <div className="px-5 sm:px-6 pb-6 space-y-4">
        {/* Bio Text */}
        {user.bio && (
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-2xl font-medium">
            {user.bio}
          </p>
        )}

        {/* Location & website metadata */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
          {user.locationCity && (
            <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
              <MapPin className="h-3.5 w-3.5 text-purple-400" />
              <span>{user.locationCity}</span>
            </div>
          )}

          {user.website && (
            <a
              href={
                user.website.startsWith("http")
                  ? user.website
                  : `https://${user.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-xl border border-purple-500/20 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="truncate max-w-[200px]">{user.website}</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
        </div>

        {/* Followers / Following Stats Bar */}
        <div className="flex items-center gap-6 pt-3 border-t border-white/10 text-xs sm:text-sm">
          <Link
            href={followersHref}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="font-extrabold text-white">
              {user.followersCount.toLocaleString()}
            </span>
            <span className="text-white/60 font-medium">Followers</span>
          </Link>

          <Link
            href={followingHref}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="font-extrabold text-white">
              {user.followingCount.toLocaleString()}
            </span>
            <span className="text-white/60 font-medium">Following</span>
          </Link>
        </div>
      </div>
    </Card>
  );
};
