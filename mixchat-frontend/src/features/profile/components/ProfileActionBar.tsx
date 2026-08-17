"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  UserPlus,
  UserCheck,
  Clock,
  Edit3,
  Share2,
  Calendar,
  QrCode,
  MoreHorizontal,
  ShieldAlert,
  Shield,
  Star,
  Ban,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { RelationshipState } from "@/services/social/socialService";

export interface ProfileActionBarUser {
  id: string;
  username: string;
  displayName: string;
  isPrivate?: boolean;
}

interface ProfileActionBarProps {
  isOwnProfile?: boolean;
  targetUser: ProfileActionBarUser;
  relationshipState?: RelationshipState;
  isCloseFriend?: boolean;
  onFollow?: () => Promise<void>;
  onUnfollow?: () => Promise<void>;
  onToggleCloseFriend?: () => Promise<void>;
  onBlock?: () => Promise<void>;
  onUnblock?: () => Promise<void>;
  onStartChat: (userId: string) => void;
  onShareProfile: () => void;
}

export const ProfileActionBar: React.FC<ProfileActionBarProps> = ({
  isOwnProfile,
  targetUser,
  relationshipState = "NONE",
  isCloseFriend = false,
  onFollow,
  onUnfollow,
  onToggleCloseFriend,
  onBlock,
  onUnblock,
  onStartChat,
  onShareProfile,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleFollowClick = async () => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      if (relationshipState === "FOLLOWING") {
        if (onUnfollow) await onUnfollow();
        showToast(`Unfollowed @${targetUser.username}`);
      } else if (relationshipState === "REQUESTED") {
        if (onUnfollow) await onUnfollow();
        showToast("Follow request cancelled");
      } else if (relationshipState === "BLOCKED") {
        if (onUnblock) await onUnblock();
        showToast(`Unblocked @${targetUser.username}`);
      } else {
        if (onFollow) await onFollow();
        showToast(
          targetUser.isPrivate
            ? "Follow request sent"
            : `Following @${targetUser.username}`,
        );
      }
    } catch {
      showToast("Unable to update relationship");
    } finally {
      setIsMutating(false);
    }
  };

  const handleCloseFriendClick = async () => {
    setShowMoreMenu(false);
    if (!onToggleCloseFriend) return;
    try {
      await onToggleCloseFriend();
      showToast(
        isCloseFriend
          ? `Removed @${targetUser.username} from Close Friends`
          : `Added @${targetUser.username} to Close Friends`,
      );
    } catch {
      showToast("Failed to update Close Friends");
    }
  };

  const handleBlockClick = async () => {
    setShowMoreMenu(false);
    if (!onBlock) return;
    try {
      await onBlock();
      showToast(`Blocked @${targetUser.username}`);
    } catch {
      showToast("Failed to block user");
    }
  };

  if (isOwnProfile) {
    return (
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <Link href="/profile/edit" className="flex-1 sm:flex-none">
          <Button
            size="sm"
            variant="glass"
            className="w-full gap-1.5 font-semibold"
          >
            <Edit3 className="h-4 w-4 text-purple-300" />
            <span>Edit Profile</span>
          </Button>
        </Link>

        <Link href="/stories/archive">
          <Button
            size="sm"
            variant="glass"
            className="px-3"
            title="Story Archive"
          >
            <Calendar className="h-4 w-4 text-purple-300" />
          </Button>
        </Link>

        <Link href="/settings/qrcode">
          <Button size="sm" variant="glass" className="px-3" title="My QR Code">
            <QrCode className="h-4 w-4 text-purple-300" />
          </Button>
        </Link>

        <Button
          onClick={onShareProfile}
          size="sm"
          variant="glass"
          className="px-3"
          title="Share Profile"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const isFollowing =
    relationshipState === "FOLLOWING" || relationshipState === "MUTUAL";
  const isRequested = relationshipState === "REQUESTED";
  const isFollowBack = relationshipState === "FOLLOWED_BY";
  const isBlocked = relationshipState === "BLOCKED";

  return (
    <div className="relative flex items-center gap-2 w-full sm:w-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="absolute -top-10 left-0 right-0 mx-auto w-fit bg-purple-600/95 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-30">
          {toastMessage}
        </div>
      )}

      {/* Primary Message CTA */}
      {!isBlocked && (
        <Button
          onClick={() => onStartChat(targetUser.id)}
          size="sm"
          className="flex-1 sm:flex-none gradient-bg-primary text-white font-bold gap-1.5 shadow-md shadow-purple-500/20 hover:scale-105 transition-transform"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Message</span>
        </Button>
      )}

      {/* Follow / Relationship Button */}
      <Button
        onClick={handleFollowClick}
        disabled={isMutating}
        size="sm"
        variant={isFollowing || isRequested ? "glass" : "gradient"}
        className="flex-1 sm:flex-none font-semibold gap-1.5"
      >
        {isFollowing ? (
          <>
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span>Following</span>
          </>
        ) : isRequested ? (
          <>
            <Clock className="h-4 w-4 text-purple-300" />
            <span>Requested</span>
          </>
        ) : isBlocked ? (
          <>
            <Ban className="h-4 w-4 text-red-400" />
            <span>Unblock</span>
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            <span>{isFollowBack ? "Follow Back" : "Follow"}</span>
          </>
        )}
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
          <div className="absolute right-0 top-11 w-48 rounded-2xl glass-panel border border-white/10 shadow-2xl p-1.5 z-40 space-y-1 bg-[#0d121f]/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
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

            {!isBlocked && (
              <button
                onClick={handleCloseFriendClick}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    isCloseFriend
                      ? "text-emerald-400 fill-emerald-400"
                      : "text-emerald-400"
                  }`}
                />
                <span>
                  {isCloseFriend
                    ? "Remove Close Friend"
                    : "Add to Close Friends"}
                </span>
              </button>
            )}

            {!isBlocked ? (
              <button
                onClick={handleBlockClick}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Block @{targetUser.username}</span>
              </button>
            ) : (
              <button
                onClick={handleFollowClick}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-purple-300 hover:bg-white/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Unblock User</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
