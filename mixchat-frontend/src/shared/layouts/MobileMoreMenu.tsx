"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  Compass,
  Flame,
  MapPin,
  Settings,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { cn } from "@/lib/utils";

interface MobileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  notificationCount?: number;
}

const destinations = [
  { label: "Profile", description: "Your posts and account", href: "/profile", icon: UserRound },
  { label: "Explore", description: "Discover people and posts", href: "/search", icon: Compass },
  { label: "Activity", description: "Notifications and requests", href: "/notifications", icon: Bell },
  { label: "Friends", description: "Manage your connections", href: "/friends", icon: UsersRound },
  { label: "Saved", description: "Posts you bookmarked", href: "/saved", icon: Bookmark },
  { label: "Map", description: "Friends and nearby activity", href: "/map", icon: MapPin },
  { label: "Anonymous", description: "Meet someone new safely", href: "/anonymous", icon: Flame },
  { label: "Settings", description: "Privacy, alerts, and account", href: "/settings", icon: Settings },
] as const;

export function MobileMoreMenu({
  isOpen,
  onClose,
  notificationCount = 0,
}: MobileMoreMenuProps) {
  const pathname = usePathname();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="More from MixChat"
      maxWidth="md"
      mobilePresentation="sheet"
      contentClassName="px-3 pb-[max(1rem,var(--sab))] pt-3 sm:px-0 sm:pb-0"
    >
      <nav aria-label="More MixChat destinations" className="grid grid-cols-2 gap-2 sm:grid-cols-1">
        {destinations.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/profile" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition-colors active:bg-white/10 sm:min-h-16",
                isActive
                  ? "border-purple-400/35 bg-purple-500/12 text-white"
                  : "border-white/8 bg-white/[0.035] text-white/82 hover:border-white/15 hover:bg-white/[0.065]",
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-purple-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{item.label}</span>
                <span className="mt-0.5 hidden text-[11px] leading-snug text-white/48 sm:block">
                  {item.description}
                </span>
              </span>
              {item.href === "/notifications" && notificationCount > 0 && (
                <span className="absolute right-2 top-2 min-w-5 rounded-full bg-purple-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </Modal>
  );
}

