"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  MessageSquare,
  Pin,
  Check,
  X,
  Users,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
} from "lucide-react";
import { useChat } from "@/shared/providers/ChatProvider";
import { cn } from "@/lib/utils";
import { CreateGroupModal } from "./CreateGroupModal";
import { NewChatModal } from "./NewChatModal";
import { AvatarImage } from "@/shared/components/ui/AvatarImage";

export const ChatList: React.FC = () => {
  const {
    chats,
    activeChatId,
    setActiveChatId,
    currentUserId,
    isLoadingChats,
    typingUsers,
    error,
    refreshChats,
  } = useChat();

  type FilterType = "all" | "unread" | "groups" | "pinned" | "archived";

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const filteredChats = chats.filter((chat) => {
    if (filter === "archived") return Boolean(chat.isArchived);
    if (chat.isArchived) return false;

    if (filter === "unread" && chat.unreadCount === 0) return false;
    if (filter === "groups" && !chat.isGroup) return false;
    if (filter === "pinned" && !chat.isPinnedConvo) return false;

    if (search.trim()) {
      const partnerName = chat.isGroup
        ? chat.groupName
        : chat.participants.find((p) => p.id !== currentUserId)?.displayName;
      return partnerName?.toLowerCase().includes(search.toLowerCase());
    }

    return true;
  });

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const filterTabs = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "groups", label: "Groups" },
    { id: "pinned", label: "Pinned" },
    { id: "archived", label: "Archived" },
  ];

  const renderMessagePreview = (chat: (typeof chats)[number]) => {
    const message = chat.lastMessage;
    if (!message) return <span>No messages yet</span>;

    const mediaPreview =
      message.type === "voice"
        ? { icon: Mic, label: "Voice message" }
        : message.type === "image"
          ? { icon: ImageIcon, label: "Photo" }
          : message.type === "video"
            ? { icon: Video, label: "Video" }
            : message.type === "file"
              ? { icon: FileText, label: "File" }
              : null;

    if (mediaPreview) {
      const PreviewIcon = mediaPreview.icon;
      return (
        <span className="flex min-w-0 items-center gap-1.5">
          <PreviewIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{mediaPreview.label}</span>
        </span>
      );
    }

    return <span>{message.text}</span>;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0e18] select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 pb-3 pt-safe-chat-list sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-white">
            Messages
          </h1>
          {totalUnread > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-1.5 text-xs font-black tabular-nums text-white shadow-lg">
              {totalUnread}
            </span>
          )}
          </div>
          <p className="mt-0.5 text-sm font-medium text-white/50">
            Your private conversations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewChatOpen(true)}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/[0.06] text-white/80 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
            title="Direct Message"
            aria-label="Direct Message"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateGroupOpen(true)}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/[0.06] text-white/80 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
            title="Create Group"
            aria-label="Create Group"
          >
            <Users className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-3 sm:px-4">
        <div className="relative flex items-center">
          <Search
            className="pointer-events-none absolute left-4 h-5 w-5 text-white/45"
            aria-hidden="true"
          />
          <input
            aria-label="Search conversations"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="h-12 w-full rounded-2xl bg-white/[0.055] pl-12 pr-12 text-base text-white outline-none transition-colors placeholder:text-white/40 hover:bg-white/[0.075] focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-purple-400/70"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              type="button"
              aria-label="Clear search"
              className="absolute right-1.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 pb-3 sm:px-4">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as FilterType)}
              className={cn(
                "min-h-9 cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-purple-500/20 text-purple-200"
                  : "bg-white/[0.035] text-white/60 hover:bg-white/[0.07] hover:text-white",
              )}
              aria-pressed={isActive}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error notification */}
      {error && (
        <div className="m-3 flex items-center justify-between rounded-2xl bg-red-500/10 p-3 text-sm text-red-200" role="alert">
          <span>{error}</span>
          <button
            onClick={() => void refreshChats()}
            className="ml-2 min-h-11 cursor-pointer rounded-xl px-3 font-bold transition-colors hover:bg-red-500/15"
          >
            Retry
          </button>
        </div>
      )}

      {/* Conversations List */}
      <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-[calc(6rem+var(--sab))] lg:pb-3">
        {isLoadingChats && chats.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex min-h-20 animate-pulse items-center gap-3 rounded-2xl px-2.5">
                <div className="h-13 w-13 shrink-0 rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/10 rounded w-2/3" />
                  <div className="h-2.5 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-48">
            <MessageSquare className="mb-3 h-10 w-10 text-white/25" aria-hidden="true" />
            <p className="text-base font-semibold text-white/60">
              No conversations found
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-3 min-h-11 cursor-pointer rounded-xl px-3 text-sm font-bold text-purple-300 hover:bg-purple-500/10"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const partner =
              chat.participants.find((p) => p.id !== currentUserId) ||
              chat.participants[0];
            const isActive = activeChatId === chat.id;
            const hasUnread = (chat.unreadCount || 0) > 0;
            const isTyping = Boolean(
              typingUsers[chat.id] && typingUsers[chat.id].length > 0,
            );

            return (
              <button
                type="button"
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={cn(
                    "group relative flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-purple-500/[0.14]"
                      : "hover:bg-white/[0.045] active:bg-white/[0.07]",
                  )}
                aria-current={isActive ? "page" : undefined}
              >
                  {/* Chat Avatar */}
                  <div className="relative shrink-0">
                    {chat.isGroup ? (
                      <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md">
                        <Users className="h-6 w-6" aria-hidden="true" />
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="h-13 w-13 overflow-hidden rounded-full bg-white/5">
                          <AvatarImage
                            src={partner?.avatar}
                            alt={partner?.displayName || "Avatar"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Real-Time Live Presence Green Dot */}
                        <span
                          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-[3px] ring-[#0a0e18] transition-colors ${
                            partner?.online
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                              : "bg-white/20"
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Name, Snippet & Timestamp */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <h4
                          className={cn(
                            "truncate text-base font-bold",
                            hasUnread
                              ? "text-white font-extrabold"
                              : "text-white/90",
                          )}
                        >
                          {chat.isGroup ? chat.groupName : partner?.displayName}
                        </h4>

                        {partner?.role === "verified" && !chat.isGroup && (
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white text-[8px] shrink-0">
                            <Check className="h-2 w-2 stroke-[3]" />
                          </span>
                        )}

                        {chat.isPinnedConvo && (
                          <Pin className="h-3 w-3 text-purple-400 rotate-45 shrink-0" />
                        )}
                      </div>

                      <span
                        className={cn(
                          "ml-2 shrink-0 text-xs font-medium tabular-nums",
                          hasUnread
                            ? "text-purple-400 font-bold"
                            : "text-white/40",
                        )}
                      >
                        {chat.lastMessage?.createdAt || ""}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={cn(
                          "truncate text-sm leading-5",
                          hasUnread
                            ? "text-white font-semibold"
                            : "text-white/50",
                        )}
                      >
                        {isTyping ? (
                          <span className="text-purple-400 font-semibold italic flex items-center gap-1 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping" />
                            typing...
                          </span>
                        ) : (
                          renderMessagePreview(chat)
                        )}
                      </div>

                      {hasUnread && (
                        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-1.5 text-xs font-black tabular-nums text-white shadow-md">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
              </button>
            );
          })
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
      />
    </div>
  );
};
