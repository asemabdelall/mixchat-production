"use client";

import React from "react";
import Link from "next/link";
import {
  MoreVertical,
  ChevronLeft,
  Users,
  Search,
  Phone,
  Video,
} from "lucide-react";
import { Chat, User } from "@/types";
import { TypingUser } from "@/shared/providers/ChatProvider";
import { useCall } from "@/features/calls/context/CallContext";

interface ChatRoomHeaderProps {
  activeChat: Chat;
  partner: User;
  activeTypers?: TypingUser[];
  showSearch: boolean;
  onToggleSearch: () => void;
  onBack: () => void;
  onOpenDetails: () => void;
}

export const ChatRoomHeader: React.FC<ChatRoomHeaderProps> = ({
  activeChat,
  partner,
  activeTypers = [],
  showSearch,
  onToggleSearch,
  onBack,
  onOpenDetails,
}) => {
  const { startCall } = useCall();

  const handleStartVoiceCall = () => {
    void startCall(activeChat.id, "VOICE");
  };

  const handleStartVideoCall = () => {
    void startCall(activeChat.id, "VIDEO");
  };

  return (
    <div className="shrink-0 px-3 sm:px-3.5 pb-2.5 sm:pb-3 pt-safe-room border-b border-white/10 flex items-center justify-between bg-[#070913]/95 backdrop-blur-xl z-20">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile Back Button */}
        <button
          onClick={onBack}
          className="lg:hidden flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white transition-all shrink-0"
          aria-label="Back to conversations"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {activeChat.isGroup ? (
          <button
            type="button"
            onClick={onOpenDetails}
            className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            aria-label="Open group details"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeChat.groupAvatar || ""}
                alt={activeChat.groupName || ""}
                className="w-full h-full object-cover"
              />
            </div>
          </button>
        ) : (
          <Link
            href={`/profile/${partner.username}`}
            className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 hover:opacity-85 transition-opacity"
            aria-label={`Open ${partner.displayName}'s profile`}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={partner.avatar}
                alt={partner.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#070913] transition-colors ${
                partner.online
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                  : "bg-white/20"
              }`}
            />
          </Link>
        )}

        <div className="min-w-0">
          {activeChat.isGroup ? (
            <button
              type="button"
              onClick={onOpenDetails}
              className="flex max-w-full items-center gap-2 text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <h3 className="truncate font-bold text-sm text-foreground">
                {activeChat.groupName}
              </h3>
              <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded-full">
                <Users className="w-3 h-3" /> {activeChat.participants.length}
              </span>
              {activeChat.isMuted && (
                <span className="text-[10px] text-muted-foreground">🔕</span>
              )}
            </button>
          ) : (
            <Link
              href={`/profile/${partner.username}`}
              className="flex max-w-full items-center gap-2 text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <h3 className="truncate font-bold text-sm text-foreground">
                {partner.displayName}
              </h3>
              {activeChat.isMuted && (
                <span className="text-[10px] text-muted-foreground">🔕</span>
              )}
            </Link>
          )}

          <div className="text-[11px] text-muted-foreground">
            {activeTypers.length > 0 ? (
              <span className="text-purple-400 font-medium flex items-center gap-1 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping" />
                {activeTypers.length === 1
                  ? `${activeTypers[0].displayName} is typing...`
                  : `${activeTypers[0].displayName} & others typing...`}
              </span>
            ) : activeChat.isGroup ? (
              `${activeChat.participants
                .map((p) => p.displayName)
                .slice(0, 3)
                .join(", ")}...`
            ) : partner.online ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online
              </span>
            ) : (
              `@${partner.username}`
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Voice Call Button */}
        <button
          type="button"
          onClick={handleStartVoiceCall}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl glass-card text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all cursor-pointer"
          title="Start Voice Call"
          aria-label="Start Voice Call"
        >
          <Phone className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </button>

        {/* Video Call Button */}
        <button
          type="button"
          onClick={handleStartVideoCall}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl glass-card text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 active:scale-95 transition-all cursor-pointer"
          title="Start Video Call"
          aria-label="Start Video Call"
        >
          <Video className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </button>

        <button
          onClick={onToggleSearch}
          className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl glass-card transition-colors ${
            showSearch
              ? "text-purple-400 bg-white/10"
              : "text-muted-foreground hover:text-white"
          }`}
          title="Search inside conversation"
          aria-label="Search inside conversation"
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          onClick={onOpenDetails}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl glass-card text-muted-foreground hover:text-white transition-colors"
          title="Details & Settings"
          aria-label="Details & Settings"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
