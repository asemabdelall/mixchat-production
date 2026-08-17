"use client";

import React from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  AtSign,
  Repeat,
  CheckCheck,
  Clock,
  Sparkles,
  ExternalLink,
  Flame,
  MessageSquare,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Tabs, TabItem } from "@/shared/components/ui/Tabs";
import { useNotifications } from "@/shared/providers/NotificationsProvider";
import {
  NotificationFilter,
  NotificationItemDto,
} from "@/services/notifications/notificationsService";
import { formatRelativeTime } from "@/lib/dateUtils";

const activityTabs: TabItem[] = [
  { id: "ALL", label: "All Activity" },
  { id: "SOCIAL", label: "Social & Follows" },
  { id: "LIKES", label: "Likes & Reposts" },
  { id: "COMMENTS", label: "Comments" },
  { id: "MENTIONS", label: "Mentions" },
];

function getNotificationDetails(notif: NotificationItemDto): {
  icon: React.ReactNode;
  badgeBg: string;
  actionText: string;
  contextLink: string;
  contextLabel: string;
} {
  switch (notif.type) {
    case "FOLLOW":
      return {
        icon: <UserCheck className="h-3.5 w-3.5 text-emerald-400" />,
        badgeBg: "bg-emerald-500/20 border-emerald-500/30",
        actionText: "started following you",
        contextLink: notif.actor
          ? `/profile/${notif.actor.username}`
          : "/notifications",
        contextLabel: "View Profile",
      };
    case "FOLLOW_REQUEST":
      return {
        icon: <UserPlus className="h-3.5 w-3.5 text-cyan-400" />,
        badgeBg: "bg-cyan-500/20 border-cyan-500/30",
        actionText: "sent you a follow request",
        contextLink: notif.actor
          ? `/profile/${notif.actor.username}`
          : "/notifications",
        contextLabel: "Review Request",
      };
    case "FOLLOW_ACCEPT":
      return {
        icon: <UserCheck className="h-3.5 w-3.5 text-emerald-400" />,
        badgeBg: "bg-emerald-500/20 border-emerald-500/30",
        actionText: "accepted your follow request",
        contextLink: notif.actor
          ? `/profile/${notif.actor.username}`
          : "/notifications",
        contextLabel: "View Profile",
      };
    case "LIKE_POST":
      return {
        icon: <Heart className="h-3.5 w-3.5 text-pink-400 fill-pink-400" />,
        badgeBg: "bg-pink-500/20 border-pink-500/30",
        actionText: "liked your post",
        contextLink: `/feed/${notif.entityId}`,
        contextLabel: "View Post",
      };
    case "LIKE_COMMENT":
      return {
        icon: <Heart className="h-3.5 w-3.5 text-pink-400 fill-pink-400" />,
        badgeBg: "bg-pink-500/20 border-pink-500/30",
        actionText: "liked your comment",
        contextLink: notif.targetUrl || "/feed",
        contextLabel: "View Discussion",
      };
    case "REEL_LIKE":
      return {
        icon: <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400" />,
        badgeBg: "bg-rose-500/20 border-rose-500/30",
        actionText: "liked your reel",
        contextLink: notif.targetUrl || `/reels?id=${notif.entityId}`,
        contextLabel: "Watch Reel",
      };
    case "COMMENT_POST":
      return {
        icon: <MessageCircle className="h-3.5 w-3.5 text-purple-400" />,
        badgeBg: "bg-purple-500/20 border-purple-500/30",
        actionText: "commented on your post",
        contextLink: `/feed/${notif.entityId}`,
        contextLabel: "View Comment",
      };
    case "REEL_COMMENT":
      return {
        icon: <MessageCircle className="h-3.5 w-3.5 text-fuchsia-400" />,
        badgeBg: "bg-fuchsia-500/20 border-fuchsia-500/30",
        actionText: "commented on your reel",
        contextLink: notif.targetUrl || `/reels?id=${notif.entityId}`,
        contextLabel: "Watch Reel",
      };
    case "REPLY_COMMENT":
      return {
        icon: <MessageCircle className="h-3.5 w-3.5 text-indigo-400" />,
        badgeBg: "bg-indigo-500/20 border-indigo-500/30",
        actionText: "replied to your comment",
        contextLink: notif.targetUrl || `/feed/${notif.entityId}`,
        contextLabel: "View Reply",
      };
    case "MENTION_COMMENT":
    case "MENTION_POST":
      return {
        icon: <AtSign className="h-3.5 w-3.5 text-amber-400" />,
        badgeBg: "bg-amber-500/20 border-amber-500/30",
        actionText: "mentioned you",
        contextLink: notif.targetUrl || `/feed/${notif.entityId}`,
        contextLabel: "View Mention",
      };
    case "REPOST_POST":
      return {
        icon: <Repeat className="h-3.5 w-3.5 text-blue-400" />,
        badgeBg: "bg-blue-500/20 border-blue-500/30",
        actionText: "reposted your post",
        contextLink: `/feed/${notif.entityId}`,
        contextLabel: "View Repost",
      };
    case "MESSAGE_NEW":
      return {
        icon: <MessageSquare className="h-3.5 w-3.5 text-sky-400" />,
        badgeBg: "bg-sky-500/20 border-sky-500/30",
        actionText: "sent you a message",
        contextLink: notif.targetUrl || "/chat",
        contextLabel: "Open Chat",
      };
    case "STORY_REACTION":
      return {
        icon: <Flame className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />,
        badgeBg: "bg-orange-500/20 border-orange-500/30",
        actionText: "reacted to your story",
        contextLink: notif.targetUrl || "/stories",
        contextLabel: "View Story",
      };
    case "STORY_REPLY":
      return {
        icon: <MessageCircle className="h-3.5 w-3.5 text-violet-400" />,
        badgeBg: "bg-violet-500/20 border-violet-500/30",
        actionText: "replied to your story",
        contextLink: notif.targetUrl || "/stories",
        contextLabel: "View Story",
      };
    default:
      return {
        icon: <Sparkles className="h-3.5 w-3.5 text-purple-400" />,
        badgeBg: "bg-purple-500/20 border-purple-500/30",
        actionText: "interacted with you",
        contextLink: notif.targetUrl || "/feed",
        contextLabel: "View Context",
      };
  }
}

export const ActivityTimelineV2: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    filter,
    setFilter,
    loadMore,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 pb-20 sm:pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Activity & Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full gradient-bg-primary text-white font-bold shadow-md shrink-0">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Realtime record of likes, mentions, comments, and new followers
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void markAllAsRead()}
            className="text-xs font-bold text-purple-300 hover:text-white hover:bg-white/10 gap-1.5 shrink-0 self-start sm:self-center px-2.5 py-1.5 h-auto rounded-xl border border-purple-500/20 sm:border-transparent"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Mark all read</span>
          </Button>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs
        tabs={activityTabs}
        activeTab={filter}
        onChange={(val) => setFilter(val as NotificationFilter)}
      />

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200"
        >
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refreshNotifications()}
            className="shrink-0 text-rose-100 hover:bg-rose-500/15"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Activity Stream */}
      <div className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          // Loading Skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 sm:p-4 rounded-2xl glass-panel border border-white/10 animate-pulse flex items-start gap-3 sm:gap-3.5"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-1/3 rounded bg-white/10" />
                <div className="h-2.5 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))
        ) : notifications.length > 0 ? (
          notifications.map((notif) => {
            const details = getNotificationDetails(notif);
            const isUnread = !notif.readAt;
            const previewText = notif.metadata?.previewText as
              string | undefined;

            return (
              <Card
                key={notif.id}
                className={`p-3.5 sm:p-4 rounded-2xl transition-all duration-200 flex items-start gap-3 sm:gap-3.5 border ${
                  isUnread
                    ? "bg-purple-950/20 border-purple-500/30 hover:border-purple-500/50 shadow-md shadow-purple-900/10"
                    : "glass-panel border-white/10 hover:border-white/20"
                }`}
              >
                {/* Actor Avatar with Type Badge */}
                <div className="relative shrink-0 mt-0.5">
                  <Link
                    href={
                      notif.actor
                        ? `/profile/${notif.actor.username}`
                        : "/notifications"
                    }
                  >
                    <Avatar
                      src={
                        notif.actor?.avatarUrl ||
                        "/mixchat-icon.png"
                      }
                      alt={
                        notif.actor?.displayName ||
                        notif.actor?.username ||
                        "MixChat"
                      }
                      size="md"
                      className="cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
                    />
                  </Link>
                  <div
                    className={`absolute -bottom-1 -right-1 p-1 rounded-full border ${details.badgeBg} shadow-sm`}
                  >
                    {details.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs leading-relaxed text-foreground">
                      {notif.actor ? (
                        <Link
                          href={`/profile/${notif.actor.username}`}
                          className="font-bold text-white hover:text-purple-300 transition-colors mr-1"
                        >
                          {notif.actor.displayName ||
                            `@${notif.actor.username}`}
                        </Link>
                      ) : (
                        <span className="font-bold text-white mr-1">
                          MixChat
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {details.actionText}
                      </span>
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  {/* Metadata Quote Preview (if comment/mention/post preview exists) */}
                  {previewText && (
                    <div className="mt-1.5 p-2 rounded-xl bg-black/25 border-l-2 border-purple-400/60 text-[11px] text-purple-200 italic line-clamp-2">
                      &ldquo;{previewText}&rdquo;
                    </div>
                  )}

                  {/* Action Link & Unread Dot */}
                  <div className="mt-2.5 flex items-center justify-between">
                    <Link
                      href={details.contextLink}
                      onClick={() => {
                        if (isUnread) void markAsRead(notif.id);
                      }}
                      className="inline-flex min-h-11 items-center gap-1 text-[11px] font-bold text-purple-300 hover:text-purple-200 transition-colors"
                    >
                      <span>{details.contextLabel}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>

                    {isUnread && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-purple-400">
                        <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
                        New
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          /* Empty State */
          <div className="text-center py-16 glass-panel rounded-3xl border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl glass-card border border-white/10 flex items-center justify-center mx-auto text-purple-400">
              <Clock className="h-6 w-6 opacity-70" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">No activity yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                When people like, comment, mention you, or follow your profile,
                their actions will show up right here in real time.
              </p>
            </div>
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="pt-2 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadMore()}
              className="text-xs border-white/15 hover:bg-white/10 font-bold"
            >
              Load earlier activity
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
