"use client";

import React from "react";
import { Image as ImageIcon, Film } from "lucide-react";
import { useAuth } from "@/shared/providers/AuthProvider";

interface FeedComposerWidgetProps {
  onOpenCreatePost: () => void;
  onOpenCreateStory: () => void;
}

export const FeedComposerWidget: React.FC<FeedComposerWidgetProps> = ({
  onOpenCreatePost,
  onOpenCreateStory,
}) => {
  const { user } = useAuth();
  const displayName = user?.displayName || user?.username || "Friend";
  const firstName = displayName.split(" ")[0];
  const avatarUrl = user?.avatarUrl || "/mixchat-icon.png";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#111728]/90 via-[#0c101d]/95 to-[#070913]/95 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl shadow-purple-950/20 transition-all duration-300 hover:border-purple-500/30 group select-none">
      {/* Subtle Top Ambient Glow Line */}
      <div className="absolute top-0 inset-x-10 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Composer Row */}
      <div className="flex items-center gap-3.5">
        {/* User Avatar with Ring */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-pink-500 shadow-md">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#070913]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Interactive Input Capsule */}
        <button
          onClick={onOpenCreatePost}
          className="flex-1 min-h-12 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-purple-500/40 px-4 sm:px-5 flex items-center text-left text-xs sm:text-sm text-white/50 hover:text-white transition-all shadow-inner"
        >
          <span className="truncate font-medium">
            Share what&apos;s on your mind, {firstName}...
          </span>
        </button>
      </div>

      {/* Media Action Pills Row */}
      <div className="pt-3.5 mt-3.5 border-t border-white/5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Photo Button */}
          <button
            onClick={onOpenCreatePost}
            className="flex min-h-11 items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 active:scale-95 text-purple-300 hover:text-white border border-purple-500/20 transition-all"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-purple-500/20">
              <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <span className="font-bold text-xs tracking-tight">Photo</span>
          </button>

          {/* Story Button */}
          <button
            onClick={onOpenCreateStory}
            className="flex min-h-11 items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 active:scale-95 text-pink-300 hover:text-white border border-pink-500/20 transition-all"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-pink-500/20">
              <Film className="h-3.5 w-3.5 text-pink-400" />
            </div>
            <span className="font-bold text-xs tracking-tight">Story</span>
          </button>

        </div>
      </div>
    </div>
  );
};
