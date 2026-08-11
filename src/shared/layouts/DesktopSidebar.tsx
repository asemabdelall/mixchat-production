"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  MessageSquare, 
  Users, 
  Map, 
  Sparkles, 
  Bell, 
  Settings, 
  Ghost, 
  Film,
  Bookmark,
  Activity,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useAuth } from "@/shared/providers/AuthProvider";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { QuickCreateModal } from "@/shared/components/ui/QuickCreateModal";

import Image from "next/image";

export const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/reels", label: "Short Reels", icon: Film, isNew: true },
  { href: "/stories", label: "Stories", icon: Film },
  { href: "/chat", label: "Chats", icon: MessageSquare, badge: 2 },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/anonymous", label: "Anonymous", icon: Ghost },
  { href: "/saved", label: "Saved Posts", icon: Bookmark },
  { href: "/map", label: "Live Map", icon: Map },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: 3 },
  { href: "/premium", label: "Mix Premium", icon: Sparkles, highlight: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const DesktopSidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex w-64 flex-col fixed top-0 left-0 bottom-0 z-30 border-r border-white/10 glass-panel p-4 select-none">
        {/* Brand Header */}
        <Link href="/feed" className="flex items-center gap-3 px-3 py-2 mb-4 group">
          <Image
            src="/mixchat-icon.png"
            alt="Mix Chat Logo"
            width={40}
            height={49}
            priority
            className="h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform"
          />
          <span className="font-black text-lg tracking-widest text-white">
            MIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">CHAT</span>
          </span>
        </Link>

        {/* Global Quick Create Action Button */}
        <div className="mb-4 px-1">
          <Button
            onClick={() => setIsQuickCreateOpen(true)}
            size="default"
            className="w-full h-11 justify-center gap-2 font-bold shadow-lg shadow-purple-500/20"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Create</span>
          </Button>
        </div>

        {/* Nav Menu */}
        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/feed" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "gradient-bg-primary text-white shadow-md shadow-purple-500/25 font-bold"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  item.highlight && !isActive && "text-purple-400 hover:text-purple-300 bg-purple-500/10 border border-purple-500/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4.5 w-4.5 transition-transform group-hover:scale-110", isActive && "text-white")} />
                  <span>{item.label}</span>
                </div>

                {item.badge ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold",
                      isActive ? "bg-white/20 text-white" : "gradient-bg-primary text-white"
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}

                {item.isNew && !isActive ? (
                  <Badge variant="accent" className="text-[9px] px-1.5 py-0">
                    HOT
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Card */}
        {user && (
          <div className="pt-3 border-t border-white/10 mt-auto">
            <div className="flex items-center justify-between gap-2 rounded-2xl glass-card p-2.5 hover:bg-white/10 transition-colors group">
              <Link
                href="/profile"
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
              >
                <Avatar src={user.avatar} alt={user.displayName} online={user.online} isVerified={user.role === "verified"} size="sm" />
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-xs truncate text-foreground group-hover:text-purple-300 transition-colors">{user.displayName}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
                </div>
              </Link>
              <Link
                href="/settings"
                aria-label="Settings"
                className="p-1 text-muted-foreground hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </aside>

      <QuickCreateModal isOpen={isQuickCreateOpen} onClose={() => setIsQuickCreateOpen(false)} />
    </>
  );
};

