"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MessageSquare, UserPlus, UserCheck, Edit3, Share2, Calendar, QrCode, MoreHorizontal, ShieldAlert, Check, Phone } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { User } from "@/types";

interface ProfileActionBarProps {
  isOwnProfile?: boolean;
  targetUser: User;
  isFollowing: boolean;
  onToggleFollow: () => void;
  friendStatus: "none" | "requested" | "friends";
  onToggleFriendStatus: () => void;
  onStartChat: (userId: string) => void;
  onStartCall: (user: User) => void;
  onShareProfile: () => void;
}

export const ProfileActionBar: React.FC<ProfileActionBarProps> = ({
  isOwnProfile,
  targetUser,
  isFollowing,
  onToggleFollow,
  friendStatus,
  onToggleFriendStatus,
  onStartChat,
  onStartCall,
  onShareProfile,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  if (isOwnProfile) {
    return (
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <Link href="/profile/edit" className="flex-1 sm:flex-none">
          <Button size="sm" variant="glass" className="w-full gap-1.5 font-semibold">
            <Edit3 className="h-4 w-4 text-purple-300" />
            <span>Edit Profile</span>
          </Button>
        </Link>

        <Link href="/stories/archive">
          <Button size="sm" variant="glass" className="px-3" title="Story Archive">
            <Calendar className="h-4 w-4 text-purple-300" />
          </Button>
        </Link>

        <Link href="/settings/qrcode">
          <Button size="sm" variant="glass" className="px-3" title="My QR Code">
            <QrCode className="h-4 w-4 text-purple-300" />
          </Button>
        </Link>

        <Button onClick={onShareProfile} size="sm" variant="glass" className="px-3" title="Share Profile">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2 w-full sm:w-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="absolute -top-10 left-0 right-0 mx-auto w-fit bg-purple-600/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-30">
          {toastMessage}
        </div>
      )}

      {/* Primary Message CTA */}
      <Button
        onClick={() => onStartChat(targetUser.id)}
        size="sm"
        className="flex-1 sm:flex-none gradient-bg-primary text-white font-bold gap-1.5 shadow-md shadow-purple-500/20 hover:scale-105 transition-transform"
      >
        <MessageSquare className="h-4 w-4" />
        <span>Message</span>
      </Button>

      {/* Follow Button */}
      <Button
        onClick={() => {
          onToggleFollow();
          showToast(isFollowing ? "Unfollowed" : `Following @${targetUser.username}`);
        }}
        size="sm"
        variant={isFollowing ? "glass" : "gradient"}
        className="flex-1 sm:flex-none font-semibold gap-1.5"
      >
        {isFollowing ? <UserCheck className="h-4 w-4 text-emerald-400" /> : <UserPlus className="h-4 w-4" />}
        <span>{isFollowing ? "Following" : "Follow"}</span>
      </Button>

      {/* Friend Request Button */}
      <Button
        onClick={() => {
          onToggleFriendStatus();
          showToast(
            friendStatus === "none"
              ? "Friend request sent!"
              : friendStatus === "requested"
              ? "Request cancelled"
              : "Friend status updated"
          );
        }}
        size="sm"
        variant="glass"
        className="px-3 text-xs font-semibold gap-1"
        title="Friendship Status"
      >
        {friendStatus === "friends" ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Friends</span>
          </>
        ) : friendStatus === "requested" ? (
          <>
            <Check className="h-3.5 w-3.5 text-purple-300" />
            <span className="hidden sm:inline">Requested</span>
          </>
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </>
        )}
      </Button>

      {/* Call Button */}
      <Button
        onClick={() => onStartCall(targetUser)}
        size="sm"
        variant="glass"
        className="px-3 text-purple-300"
        title="Voice Call"
      >
        <Phone className="h-4 w-4" />
      </Button>

      {/* More Options Dropdown */}
      <div className="relative">
        <Button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          size="sm"
          variant="glass"
          className="px-2.5"
          title="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {showMoreMenu && (
          <div className="absolute right-0 top-11 w-44 rounded-2xl glass-panel border border-white/10 shadow-2xl p-1.5 z-40 space-y-1 bg-[#0d121f]/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                setShowMoreMenu(false);
                onShareProfile();
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-purple-400" />
              <span>Share Profile</span>
            </button>

            <button
              onClick={() => {
                setShowMoreMenu(false);
                showToast(`Muted @${targetUser.username}`);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-orange-400" />
              <span>Mute Profile</span>
            </button>

            <button
              onClick={() => {
                setShowMoreMenu(false);
                showToast("Report submitted to moderation");
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Report User</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
