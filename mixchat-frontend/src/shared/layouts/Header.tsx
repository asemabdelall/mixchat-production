"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Bell } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useAuth } from "@/shared/providers/AuthProvider";
import { useNotifications } from "@/shared/providers/NotificationsProvider";
import Image from "next/image";

export const Header: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isSearchPage = pathname === "/search";
  const displayName = user?.displayName || user?.username || "User";
  const avatarUrl = user?.avatarUrl || "/mixchat-icon.png";

  return (
    <header className="w-full bg-[#090c15]/70 backdrop-blur-md border-b border-white/10 px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3 transition-all pt-[max(0.625rem,env(safe-area-inset-top))] shadow-sm">
      <div className="flex items-center justify-between gap-2.5 sm:gap-4 max-w-7xl mx-auto">
        {/* Mobile & Tablet Logo (Hidden on Desktop since DesktopSidebar already displays brand logo) */}
        <Link
          href="/feed"
          className="lg:hidden flex items-center gap-2 group shrink-0 select-none"
        >
          <Image
            src="/mixchat-icon.png"
            alt="Mix Chat Logo"
            width={32}
            height={39}
            priority
            className="h-8 sm:h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform"
          />
          <span className="font-extrabold text-sm sm:text-base tracking-wider text-white">
            MIX{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              CHAT
            </span>
          </span>
        </Link>

        {/* Global Search Bar on Desktop & Tablet */}
        {!isSearchPage ? (
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-md hidden sm:block"
          >
            <Input
              icon={<Search className="h-4 w-4 text-purple-400" />}
              placeholder="Search users, posts, or tags..."
              aria-label="Search users, posts, or tags"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 text-xs bg-white/[0.04] border-white/10 focus:border-purple-500/50 backdrop-blur-md shadow-inner"
            />
          </form>
        ) : (
          <div className="flex-1 max-w-md hidden sm:block text-xs font-semibold text-purple-300">
            Search
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Search Button */}
          {!isSearchPage && (
            <Link
              href="/search"
              aria-label="Search"
              className="sm:hidden flex items-center justify-center w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white active:scale-95 transition-all"
            >
              <Search className="h-4 w-4" />
            </Link>
          )}

          <Link
            href="/notifications"
            aria-label="View notifications"
            className="relative flex items-center justify-center w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white active:scale-95 transition-all"
          >
            <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full gradient-bg-primary text-[8px] sm:text-[9px] font-bold text-white shadow-[0_0_6px_rgba(168,85,247,0.8)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>

          {user && (
            <Link
              href="/profile"
              aria-label="View profile"
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full active:scale-95 transition-transform"
            >
              <Avatar
                src={avatarUrl}
                alt={displayName}
                size="sm"
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
