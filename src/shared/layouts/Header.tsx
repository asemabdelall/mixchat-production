"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, Bell, Sparkles, Phone, Video } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useAuth } from "@/shared/providers/AuthProvider";
import { useCall } from "@/shared/providers/CallProvider";
import { Button } from "@/shared/components/ui/Button";

import Image from "next/image";

export const Header: React.FC = () => {
  const { user } = useAuth();
  const { activeCall } = useCall();
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

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 glass-panel px-4 lg:px-8 py-3 transition-all">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Mobile & Desktop Logo */}
        <Link href="/feed" className="flex items-center gap-2.5 group shrink-0">
          <Image
            src="/mixchat-icon.png"
            alt="Mix Chat Logo"
            width={36}
            height={44}
            priority
            className="h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.4)] group-hover:scale-105 transition-transform"
          />
          <span className="font-extrabold text-base tracking-wider text-white">
            MIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">CHAT</span>
          </span>
        </Link>

        {/* Global Search Bar (Hidden on /search page to prevent P0 UI search duplication) */}
        {!isSearchPage ? (
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden sm:block">
            <Input
              icon={<Search className="h-4 w-4" />}
              placeholder="Search users, posts, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 text-xs"
            />
          </form>
        ) : (
          <div className="flex-1 max-w-md hidden sm:block text-xs font-semibold text-purple-300">
            Search Mode Active
          </div>
        )}

        {/* Active Call Banner Alert (if calling) */}
        {activeCall && activeCall.status === "connected" && (
          <div className="flex items-center gap-2 rounded-full gradient-bg-primary px-3 py-1 text-xs text-white shadow-md animate-pulse">
            {activeCall.type === "video" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
            <span className="font-semibold">{activeCall.type === "video" ? "Video Call" : "Voice Call"} Active ({activeCall.partner.displayName})</span>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/premium" className="hidden sm:inline-flex">
            <Button variant="accent" size="sm" className="gap-1.5 font-bold shadow-pink-500/20">
              <Sparkles className="h-4 w-4" />
              <span>Upgrade VIP</span>
            </Button>
          </Link>

          <Link
            href="/notifications"
            aria-label="View notifications"
            className="relative rounded-xl glass-card p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full gradient-bg-primary text-[9px] font-bold text-white shadow-sm">
              3
            </span>
          </Link>

          {user && (
            <Link href="/profile" aria-label="View profile" className="lg:hidden">
              <Avatar src={user.avatar} alt={user.displayName} size="sm" online={user.online} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
