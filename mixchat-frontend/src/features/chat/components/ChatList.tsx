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
} from "lucide-react";
import { useChat } from "@/shared/providers/ChatProvider";
import { cn } from "@/lib/utils";
import { CreateGroupModal } from "./CreateGroupModal";
import { NewChatModal } from "./NewChatModal";

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

  return (
    <div className="flex flex-col h-full bg-[#090c15] border-r border-white/10 select-none">
      {/* Top Header */}
      <div className="px-4 pb-3.5 pt-safe-chat-list border-b border-white/10 flex items-center justify-between bg-[#090c15]">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Messages
          </h2>
          {totalUnread > 0 && (
            <span className="flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[10px] font-black text-white shadow-lg">
              {totalUnread}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Direct Message"
            aria-label="Direct Message"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsCreateGroupOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Create Group"
            aria-label="Create Group"
          >
            <Users className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-white/5">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-2 px-3 border-b border-white/5 overflow-x-auto custom-scrollbar no-scrollbar">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as FilterType)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                isActive
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-3 m-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => void refreshChats()}
            className="underline font-bold ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/[0.03]">
        {isLoadingChats && chats.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/10 rounded w-2/3" />
                  <div className="h-2.5 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-48">
            <MessageSquare className="h-8 w-8 text-white/20 mb-2" />
            <p className="text-xs text-white/40 font-medium">
              No conversations found
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-2 text-xs text-purple-400 hover:underline"
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
                    "flex w-full items-center gap-3 p-3 sm:px-3.5 transition-all relative group text-left",
                    isActive
                      ? "bg-purple-600/15 border-l-2 border-purple-500"
                      : "hover:bg-white/[0.03]",
                  )}
              >
                  {/* Chat Avatar */}
                  <div className="relative shrink-0">
                    {chat.isGroup ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md">
                        <Users className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              partner?.avatar ||
                              "/mixchat-icon.png"
                            }
                            alt={partner?.displayName || "Avatar"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Real-Time Live Presence Green Dot */}
                        <span
                          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#090c15] transition-colors ${
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
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <h4
                          className={cn(
                            "text-sm font-bold truncate",
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
                          "text-[11px] shrink-0 font-medium ml-2",
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
                          "text-xs truncate",
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
                        ) : chat.lastMessage?.type === "voice" ? (
                          "🎤 Voice note"
                        ) : chat.lastMessage?.type === "image" ? (
                          "📷 Photo"
                        ) : chat.lastMessage?.type === "video" ? (
                          "🎬 Video"
                        ) : chat.lastMessage?.type === "file" ? (
                          "📁 File"
                        ) : (
                          chat.lastMessage?.text || "No messages yet"
                        )}
                      </div>

                      {hasUnread && (
                        <span className="flex h-4.5 min-w-[18px] px-1.5 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[10px] font-black text-white shadow-md shrink-0">
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
