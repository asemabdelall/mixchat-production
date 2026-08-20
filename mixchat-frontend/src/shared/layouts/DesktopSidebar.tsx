"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageCircle,
  Clapperboard,
  Compass,
  MapPin,
  Flame,
  Settings,
  Plus,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { QuickCreateModal } from "@/shared/components/ui/QuickCreateModal";
import { useAuth } from "@/shared/providers/AuthProvider";
import { useChat } from "@/shared/providers/ChatProvider";
import { useNotifications } from "@/shared/providers/NotificationsProvider";
import Image from "next/image";

export const DesktopSidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { chats } = useChat();
  const { unreadCount: notifUnreadCount } = useNotifications();
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  const totalUnreadCount = chats.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0,
  );

  const navItems = [
    { label: "Home", icon: Home, href: "/feed" },
    {
      label: "Messages",
      icon: MessageCircle,
      href: "/chat",
      badge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
    },
    {
      label: "Activity",
      icon: Bell,
      href: "/notifications",
      badge: notifUnreadCount > 0 ? notifUnreadCount : undefined,
    },
    { label: "Reels", icon: Clapperboard, href: "/reels" },
    { label: "Explore", icon: Compass, href: "/search" },
    { label: "Map", icon: MapPin, href: "/map" },
    { label: "Anonymous", icon: Flame, href: "/anonymous" },
  ];

  const displayName = user?.displayName || user?.username || "MixChat User";
  const avatarUrl = user?.avatarUrl;

  return (
    <>
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-[#090c15]/75 backdrop-blur-md border-r border-white/10 z-40 p-4 select-none">
        <div className="flex flex-col h-full">
          {/* Brand Logo Header */}
          <div className="px-3 py-3 mb-2 flex items-center justify-between">
            <Link href="/feed" className="flex items-center gap-2.5 group">
              <Image
                src="/mixchat-icon.png"
                alt="Mix Chat Logo"
                width={36}
                height={44}
                priority
                className="h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform"
              />
              <div>
                <span className="font-extrabold text-base tracking-wider text-white">
                  MIX{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                    CHAT
                  </span>
                </span>
              </div>
            </Link>
          </div>

          {/* Prominent Create Action Button */}
          <div className="mb-3 px-1">
            <Button
              onClick={() => setIsQuickCreateOpen(true)}
              size="default"
              className="w-full h-11 justify-center gap-2 font-bold gradient-bg-primary text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:opacity-95 active:scale-95 transition-all cursor-pointer rounded-2xl border border-white/15"
            >
              <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
              <span className="text-xs tracking-wide font-extrabold">
                Create
              </span>
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/feed" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer group",
                    isActive
                      ? "gradient-bg-primary text-white shadow-lg shadow-purple-500/30 font-bold border border-white/20"
                      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground hover:translate-x-0.5",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4.5 w-4.5 transition-transform group-hover:scale-110",
                        isActive && "text-white",
                      )}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-bold shadow-[0_0_8px_rgba(168,85,247,0.6)]",
                        isActive
                          ? "bg-white/20 text-white"
                          : "gradient-bg-primary text-white",
                      )}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Card */}
          {user && (
            <div className="pt-3 border-t border-white/10 mt-auto">
              <div className="flex items-center justify-between gap-2 rounded-2xl liquid-glass-card p-2.5 hover:border-purple-500/40 transition-all group">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <Avatar
                    src={avatarUrl}
                    alt={displayName}
                    size="sm"
                  />
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-xs truncate text-foreground group-hover:text-purple-300 transition-colors">
                        {displayName}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                </Link>
                <Link
                  href="/settings"
                  aria-label="Settings"
                  className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Quick Create Modal for Post, Story, Reel, Direct Message, Group */}
      <QuickCreateModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
      />
    </>
  );
};
