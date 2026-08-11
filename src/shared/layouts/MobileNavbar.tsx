"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Plus, MessageSquare, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickCreateModal } from "@/shared/components/ui/QuickCreateModal";

export const MobileNavbar: React.FC = () => {
  const pathname = usePathname();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#090c15]/95 backdrop-blur-xl px-4 py-2">
        <nav aria-label="Mobile Main Navigation" className="flex items-center justify-around max-w-md mx-auto relative select-none">
          {/* Feed */}
          <Link
            href="/feed"
            aria-current={pathname === "/feed" ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 transition-colors cursor-pointer select-none",
              pathname === "/feed" ? "text-purple-400 font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Feed</span>
          </Link>

          {/* Map */}
          <Link
            href="/map"
            aria-current={pathname === "/map" ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 transition-colors cursor-pointer select-none",
              pathname === "/map" ? "text-purple-400 font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Map className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Map</span>
          </Link>

          {/* Center Plus Button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            aria-label="Create content"
            className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-bg-primary text-white shadow-lg shadow-purple-500/40 -mt-5 hover:scale-105 active:scale-95 transition-transform border-2 border-background cursor-pointer"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>

          {/* Chat */}
          <Link
            href="/chat"
            aria-current={pathname.startsWith("/chat") ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 transition-colors cursor-pointer select-none",
              pathname.startsWith("/chat") ? "text-purple-400 font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <MessageSquare className="h-5 w-5" />
              <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full gradient-bg-primary text-[8px] font-bold text-white shadow-xs">
                2
              </span>
            </div>
            <span className="text-[10px] mt-1 font-medium">Chat</span>
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 transition-colors cursor-pointer select-none",
              pathname === "/profile" ? "text-purple-400 font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserIcon className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">Profile</span>
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
