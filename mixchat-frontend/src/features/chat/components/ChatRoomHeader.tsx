"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MoreVertical,
  ChevronLeft,
  Users,
  Search,
  Phone,
  Video,
  BellOff,
  Info,
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
  const [showMobileActions, setShowMobileActions] = useState(false);

  const handleStartVoiceCall = () => {
    void startCall(activeChat.id, "VOICE");
  };

  const handleStartVideoCall = () => {
    void startCall(activeChat.id, "VIDEO");
  };

  return (
    <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 bg-[#080c16]/95 px-2 pb-2.5 pt-safe-room shadow-[0_10px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:px-4 sm:pb-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {/* Mobile Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:bg-white/15 lg:hidden"
          aria-label="Back to conversations"
        >
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>

        {activeChat.isGroup ? (
          <button
            type="button"
            onClick={onOpenDetails}
            className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-purple-500/15 text-purple-200 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:h-12 sm:w-12"
            aria-label="Open group details"
          >
            {activeChat.groupAvatar ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeChat.groupAvatar}
                  alt={activeChat.groupName || "Group conversation"}
                  className="h-full w-full object-cover"
                />
              </>
            ) : (
              <Users className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        ) : (
          <Link
            href={`/profile/${partner.username}`}
            className="relative h-11 w-11 shrink-0 rounded-full transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:h-12 sm:w-12"
            aria-label={`Open ${partner.displayName}'s profile`}
          >
            <div className="h-full w-full overflow-hidden rounded-full bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={partner.avatar}
                alt={partner.displayName}
                className="h-full w-full object-cover"
              />
            </div>
            <span
              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-[3px] ring-[#080c16] transition-colors ${
                partner.online
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                  : "bg-white/20"
              }`}
            />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          {activeChat.isGroup ? (
            <button
              type="button"
              onClick={onOpenDetails}
              className="flex max-w-full cursor-pointer items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <h2 className="truncate text-base font-bold text-foreground sm:text-lg">
                {activeChat.groupName}
              </h2>
              <span className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-bold text-purple-200">
                <Users className="h-3 w-3" aria-hidden="true" />
                {activeChat.participants.length}
              </span>
              {activeChat.isMuted && (
                <BellOff
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-label="Muted conversation"
                />
              )}
            </button>
          ) : (
            <Link
              href={`/profile/${partner.username}`}
              className="flex max-w-full items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <h2 className="truncate text-base font-bold text-foreground sm:text-lg">
                {partner.displayName}
              </h2>
              {activeChat.isMuted && (
                <BellOff
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-label="Muted conversation"
                />
              )}
            </Link>
          )}

          <div className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
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
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Voice Call Button */}
        <button
          type="button"
          onClick={handleStartVoiceCall}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/65 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 active:bg-emerald-500/15"
          title="Start Voice Call"
          aria-label="Start Voice Call"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Video Call Button */}
        <button
          type="button"
          onClick={handleStartVideoCall}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/65 transition-colors hover:bg-sky-500/10 hover:text-sky-300 active:bg-sky-500/15"
          title="Start Video Call"
          aria-label="Start Video Call"
        >
          <Video className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          onClick={onToggleSearch}
          type="button"
          className={`hidden h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors sm:flex ${
            showSearch
              ? "bg-purple-500/15 text-purple-300"
              : "text-white/65 hover:bg-white/[0.07] hover:text-white"
          }`}
          title="Search inside conversation"
          aria-label="Search inside conversation"
          aria-pressed={showSearch}
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onOpenDetails}
          className="hidden h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/[0.07] hover:text-white sm:flex"
          title="Details & Settings"
          aria-label="Details & Settings"
        >
          <MoreVertical className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setShowMobileActions((current) => !current)}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/[0.07] active:bg-white/15"
            aria-label="Conversation actions"
            aria-expanded={showMobileActions}
          >
            <MoreVertical className="h-5 w-5" aria-hidden="true" />
          </button>

          {showMobileActions && (
            <>
              <button
                type="button"
                onClick={() => setShowMobileActions(false)}
                className="fixed inset-0 z-30 cursor-default"
                aria-label="Close conversation actions"
              />
              <div className="absolute right-0 top-12 z-40 w-52 rounded-2xl bg-[#171d2c]/98 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    setShowMobileActions(false);
                    onToggleSearch();
                  }}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.07] active:bg-white/10"
                >
                  <Search
                    className="h-5 w-5 text-purple-300"
                    aria-hidden="true"
                  />
                  Search messages
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileActions(false);
                    onOpenDetails();
                  }}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.07] active:bg-white/10"
                >
                  <Info
                    className="h-5 w-5 text-purple-300"
                    aria-hidden="true"
                  />
                  Conversation details
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
