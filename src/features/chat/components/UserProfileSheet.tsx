"use client";

import React from "react";
import Link from "next/link";
import { Shield, BellOff, ExternalLink } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { User } from "@/types";

interface UserProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onMuteToggle?: () => void;
  isMuted?: boolean;
}

export const UserProfileSheet: React.FC<UserProfileSheetProps> = ({
  isOpen,
  onClose,
  user,
  onMuteToggle,
  isMuted = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Profile">
      <div className="space-y-4 text-center">
        <div className="flex flex-col items-center">
          <Avatar
            src={user.avatar}
            alt={user.displayName}
            size="xl"
            online={user.online}
            isVerified={user.role === "verified"}
          />
          <h3 className="font-bold text-base text-foreground mt-3 flex items-center gap-1.5 justify-center">
            <span>{user.displayName}</span>
            {user.role === "verified" && <Shield className="h-4 w-4 text-purple-400 fill-purple-400/20" />}
          </h3>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
          {user.bio && <p className="text-xs text-foreground/90 max-w-xs mt-2 italic">{user.bio}</p>}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl glass-card border border-white/10 text-xs">
          <div>
            <span className="font-bold text-white block text-sm">{user.followersCount?.toLocaleString() || 14200}</span>
            <span className="text-[10px] text-muted-foreground">Followers</span>
          </div>
          <div>
            <span className="font-bold text-white block text-sm">{user.followingCount?.toLocaleString() || 680}</span>
            <span className="text-[10px] text-muted-foreground">Following</span>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <Link href={`/profile/${user.username}`} className="flex-1" onClick={onClose}>
            <Button size="sm" variant="gradient" className="w-full gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Full Profile</span>
            </Button>
          </Link>

          {onMuteToggle && (
            <Button
              onClick={onMuteToggle}
              size="sm"
              variant={isMuted ? "secondary" : "glass"}
              className="gap-1.5 text-xs"
            >
              <BellOff className="h-3.5 w-3.5" />
              <span>{isMuted ? "Unmute" : "Mute"}</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
