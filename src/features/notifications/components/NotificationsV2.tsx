"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, UserPlus, Ghost, CheckCheck, Bell, Sparkles, AtSign, Check, X } from "lucide-react";
import { MOCK_NOTIFICATIONS } from "@/shared/services/mockData";
import { NotificationItem } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Tabs, TabItem } from "@/shared/components/ui/Tabs";
import { useChat } from "@/shared/providers/ChatProvider";

const notifTabs: TabItem[] = [
  { id: "all", label: "All" },
  { id: "mentions", label: "Mentions", icon: <AtSign className="h-3.5 w-3.5" /> },
  { id: "social", label: "Social Requests", icon: <UserPlus className="h-3.5 w-3.5" /> },
  { id: "system", label: "System Alerts", icon: <Sparkles className="h-3.5 w-3.5" /> },
];

export const NotificationsV2: React.FC = () => {
  const router = useRouter();
  const { startNewChat } = useChat();
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState("all");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast("All notifications marked as read");
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    // Mark clicked notification as read
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));

    // PRECISE DEEP LINK ROUTING!
    if (notif.type === "friend_request" || notif.type === "like") {
      router.push(`/profile/${notif.sender.username}`);
    } else if (notif.type === "comment") {
      router.push(notif.targetId ? `/feed` : "/feed");
    } else if (notif.type === "anonymous_match") {
      router.push("/anonymous");
    } else {
      const chatId = startNewChat(notif.sender.id);
      if (chatId) router.push("/chat");
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === "mentions") return n.type === "comment" || n.type === "story_reply";
    if (activeTab === "social") return n.type === "friend_request" || n.type === "anonymous_match";
    if (activeTab === "system") return n.type === "anonymous_match";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "like":
        return <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />;
      case "comment":
        return <MessageCircle className="h-4 w-4 text-purple-400" />;
      case "friend_request":
        return <UserPlus className="h-4 w-4 text-blue-400" />;
      case "anonymous_match":
        return <Ghost className="h-4 w-4 text-pink-400" />;
      default:
        return <Bell className="h-4 w-4 text-purple-400" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-20 right-6 bg-purple-600/90 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-50">
          {toastMsg}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white gradient-text">Notifications Center</h1>
            {unreadCount > 0 && (
              <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time updates on likes, comments, and social requests
          </p>
        </div>

        <Button onClick={handleMarkAllRead} variant="ghost" size="sm" className="gap-1.5 text-xs text-purple-300">
          <CheckCheck className="h-4 w-4" />
          <span>Mark all read</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs tabs={notifTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Notifications Inbox List */}
      <div className="space-y-6">
        {/* Today Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Today</h3>
          {filteredNotifs.length > 0 ? (
            filteredNotifs.map((notif) => (
              <Card
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`glass-panel p-4 flex items-center justify-between gap-3.5 border-white/10 cursor-pointer transition-all hover:bg-white/10 ${
                  !notif.isRead ? "border-l-4 border-l-purple-500 bg-purple-500/5 shadow-md" : ""
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <Avatar src={notif.sender.avatar} alt={notif.sender.displayName} size="md" />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full glass-card border border-white/20">
                      {getIcon(notif.type)}
                    </span>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-white leading-normal">
                      <span className="font-bold">{notif.sender.displayName}</span> {notif.content}
                    </p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">{notif.createdAt}</span>
                  </div>
                </div>

                {/* Inline Action Triggers */}
                {notif.type === "friend_request" ? (
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      onClick={() => {
                        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
                        showToast(`Accepted friend request from @${notif.sender.username}`);
                      }}
                      size="xs"
                      className="gradient-bg-primary text-white text-xs font-bold"
                    >
                      <Check className="h-3 w-3" />
                      <span>Accept</span>
                    </Button>
                    <Button
                      onClick={() => {
                        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
                        showToast("Request declined");
                      }}
                      size="xs"
                      variant="glass"
                      className="text-xs text-muted-foreground hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : notif.type === "anonymous_match" ? (
                  <Button size="xs" variant="glass" className="shrink-0 text-purple-300 text-xs">
                    View Match
                  </Button>
                ) : null}
              </Card>
            ))
          ) : (
            <div className="text-center py-12 glass-panel rounded-2xl border border-white/10 space-y-2">
              <Bell className="h-8 w-8 text-purple-400 mx-auto opacity-40" />
              <p className="text-xs font-bold text-white">You&apos;re all caught up!</p>
              <p className="text-[11px] text-muted-foreground">No new notifications in this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
