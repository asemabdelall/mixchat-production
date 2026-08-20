"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Plus, MessageSquare, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickCreateModal } from "@/shared/components/ui/QuickCreateModal";
import { useChat } from "@/shared/providers/ChatProvider";
import { motion, useReducedMotion } from "framer-motion";

export const MobileNavbar: React.FC = () => {
  const pathname = usePathname();
  const { chats } = useChat();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const activeIndicator = (
    <motion.span
      layoutId="mobile-nav-active-indicator"
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 520, damping: 38, mass: 0.65 }
      }
      className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-purple-400 shadow-[0_0_8px_#a855f7]"
    />
  );

  const totalUnreadCount = chats.reduce(
    (acc, c) => acc + (c.unreadCount || 0),
    0,
  );

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 isolate bg-[#090c15] px-3 pt-1 pb-safe-navbar">
        <nav
          aria-label="Mobile Main Navigation"
          className="flex items-center justify-around max-w-lg mx-auto relative select-none"
        >
          {/* Feed */}
          <Link
            href="/feed"
            aria-current={pathname === "/feed" ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-w-[50px] py-0.5 rounded-xl transition-all active:scale-95 cursor-pointer select-none",
              pathname === "/feed"
                ? "text-purple-400 font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <div className="relative flex items-center justify-center">
              <Home className="h-5 w-5" />
              {pathname === "/feed" && (
                activeIndicator
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium">Feed</span>
          </Link>

          {/* Reels */}
          <Link
            href="/reels"
            aria-current={pathname === "/reels" ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-w-[56px] py-1 rounded-xl transition-all active:scale-95 cursor-pointer select-none",
              pathname === "/reels"
                ? "text-purple-400 font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <div className="relative flex items-center justify-center">
              <Film className="h-5 w-5" />
              {pathname === "/reels" && (
                activeIndicator
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium">Reels</span>
          </Link>

          {/* Center Create Button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            aria-label="Create content"
            className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-bg-primary text-white shadow-lg shadow-purple-500/40 -mt-4 hover:scale-105 active:scale-95 transition-all border border-white/20 cursor-pointer"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
          </button>

          {/* Chat */}
          <Link
            href="/chat"
            aria-current={pathname.startsWith("/chat") ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center min-w-[56px] py-1 rounded-xl transition-all active:scale-95 cursor-pointer select-none",
              pathname.startsWith("/chat")
                ? "text-purple-400 font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <div className="relative flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full gradient-bg-primary text-[8px] font-bold text-white shadow-[0_0_6px_rgba(168,85,247,0.8)]">
                  {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                </span>
              )}
              {pathname.startsWith("/chat") && (
                activeIndicator
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium">Chat</span>
          </Link>

          {/* Map */}
          <Link
            href="/map"
            aria-current={pathname === "/map" ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-w-[56px] py-1 rounded-xl transition-all active:scale-95 cursor-pointer select-none",
              pathname === "/map"
                ? "text-purple-400 font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <div className="relative flex items-center justify-center">
              <Map className="h-5 w-5" />
              {pathname === "/map" && (
                activeIndicator
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium">Map</span>
          </Link>
        </nav>
      </div>

      <QuickCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  );
};
