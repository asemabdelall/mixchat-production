"use client";

import React, { useState } from "react";
import { Search, Plus, Ghost, MessageSquare, Pin, Archive, Check, X, BellOff } from "lucide-react";
import { useChat } from "@/shared/providers/ChatProvider";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Input } from "@/shared/components/ui/Input";
import { cn } from "@/lib/utils";
import { CreateGroupModal } from "./CreateGroupModal";
import { NewChatModal } from "./NewChatModal";

export const ChatList: React.FC = () => {
  const {
    chats,
    activeChatId,
    setActiveChatId,
    startAnonymousSearch,
    togglePinChat,
    toggleArchiveChat,
    acceptMessageRequest,
    declineMessageRequest,
  } = useChat();

  type FilterType = "all" | "unread" | "groups" | "anon" | "pinned" | "requests" | "archived";

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const filteredChats = chats.filter((chat) => {
    // Handle archived tab
    if (filter === "archived") return Boolean(chat.isArchived);
    if (chat.isArchived) return false;

    // Handle requests tab
    if (filter === "requests") return Boolean(chat.isRequest);
    if (chat.isRequest) return false;

    if (filter === "unread" && chat.unreadCount === 0) return false;
    if (filter === "groups" && !chat.isGroup) return false;
    if (filter === "anon" && !chat.isAnonymous) return false;
    if (filter === "pinned" && !chat.isPinnedConvo) return false;

    if (search.trim()) {
      const partnerName = chat.isGroup
        ? chat.groupName
        : chat.participants.find((p) => p.id !== "u_me")?.displayName;
      return partnerName?.toLowerCase().includes(search.toLowerCase());
    }

    return true;
  });

  return (
    <>
      <div
        className={cn(
          "w-full lg:w-80 flex flex-col border-r border-white/10 glass-panel h-[calc(100vh-8rem)] rounded-2xl overflow-hidden shrink-0 select-none",
          activeChatId ? "hidden lg:flex" : "flex"
        )}
      >
        {/* Search & Actions Header */}
        <div className="p-3.5 border-b border-white/10 space-y-3 bg-[#0d121f]/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-foreground tracking-tight flex items-center gap-2">
              <span>Messages</span>
              {chats.some((c) => c.unreadCount > 0) && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full gradient-bg-primary text-[9px] font-bold text-white shadow-xs">
                  {chats.reduce((acc, c) => acc + c.unreadCount, 0)}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsNewChatOpen(true)}
                title="New Direct Message"
                aria-label="New Direct Message"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/30 hover:scale-105 transition-all cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                onClick={() => startAnonymousSearch("Casual Chat")}
                title="Find Anonymous Stranger"
                aria-label="Find Anonymous Stranger"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/30 hover:scale-105 transition-all cursor-pointer"
              >
                <Ghost className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsCreateGroupOpen(true)}
                title="Create Group"
                aria-label="Create Group"
                className="flex h-8 w-8 items-center justify-center rounded-xl gradient-bg-primary text-white shadow-md hover:scale-105 transition-transform cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-white/5 border-white/10"
          />

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5 pb-0.5">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "groups", label: "Groups" },
              { id: "anon", label: "Anon" },
              { id: "pinned", label: "Pinned" },
              { id: "requests", label: "Requests" },
              { id: "archived", label: "Archived" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id as FilterType)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0",
                  filter === item.id
                    ? "gradient-bg-primary text-white shadow-xs"
                    : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5 bg-[#090c15]/60">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No conversations found under &quot;{filter}&quot;.
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const partner = chat.participants.find((p) => p.id !== "u_me") || chat.participants[0];
              const title = chat.isGroup
                ? chat.groupName
                : chat.isAnonymous
                ? "Anonymous Stranger"
                : partner.displayName;

              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={cn(
                    "group relative flex items-center gap-3 p-3 cursor-pointer transition-all hover:bg-white/5",
                    isActive && "bg-purple-500/15 border-l-4 border-purple-500"
                  )}
                >
                  <div className="relative shrink-0">
                    {chat.isGroup ? (
                      <Avatar src={chat.groupAvatar || ""} alt={chat.groupName || ""} size="md" />
                    ) : chat.isAnonymous ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg-accent text-white shadow-sm">
                        <Ghost className="h-5 w-5" />
                      </div>
                    ) : (
                      <Avatar
                        src={partner.avatar}
                        alt={partner.displayName}
                        size="md"
                        online={partner.online}
                        isVerified={partner.role === "verified"}
                      />
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-semibold text-xs text-foreground truncate flex items-center gap-1.5">
                        <span className={cn(chat.unreadCount > 0 && "font-bold text-white")}>{title}</span>
                        {chat.isPinnedConvo && <Pin className="w-3 h-3 text-purple-400 shrink-0" />}
                        {chat.isMuted && <BellOff className="w-3 h-3 text-muted-foreground/60 shrink-0" />}
                        {chat.isGroup && (
                          <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.2 rounded-md shrink-0">
                            Group
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] text-muted-foreground shrink-0">{chat.updatedAt}</span>
                    </div>

                    <p className={cn(
                      "text-[11px] truncate leading-tight",
                      chat.unreadCount > 0 ? "text-purple-300 font-semibold" : "text-muted-foreground"
                    )}>
                      {chat.lastMessage?.text || "Started conversation"}
                    </p>
                  </div>

                  {/* Right Status Indicators & Quick Actions */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {chat.unreadCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full gradient-bg-primary text-[9px] font-bold text-white shadow-xs">
                        {chat.unreadCount}
                      </span>
                    )}

                    {/* Quick Item Actions */}
                    <div className="hidden group-hover:flex items-center gap-1">
                      {chat.isRequest ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptMessageRequest(chat.id);
                            }}
                            title="Accept Request"
                            className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              declineMessageRequest(chat.id);
                            }}
                            title="Decline Request"
                            className="p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/40"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinChat(chat.id);
                            }}
                            title={chat.isPinnedConvo ? "Unpin" : "Pin"}
                            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                          >
                            <Pin className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleArchiveChat(chat.id);
                            }}
                            title={chat.isArchived ? "Unarchive" : "Archive"}
                            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                          >
                            <Archive className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Group Modal */}
        <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />

        {/* New Direct Chat Modal */}
        <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      </div>
    </>
  );
};
