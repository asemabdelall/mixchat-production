"use client";

import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSplash = pathname === "/splash";

  if (isSplash) {
    return <div className="min-h-screen w-full bg-background relative overflow-x-hidden">{children}</div>;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Glow Orbs Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 gradient-bg-primary rounded-full blur-[140px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 gradient-bg-accent rounded-full blur-[120px] opacity-20 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image
            src="/mixchat-icon.png"
            alt="Mix Chat Logo"
            width={48}
            height={59}
            priority
            className="h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
          />
          <span className="font-black text-xl tracking-widest text-white">
            MIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">CHAT</span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
