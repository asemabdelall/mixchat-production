"use client";

import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSplash = pathname === "/splash";
  const isCardPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register");

  if (isSplash) {
    return <div className="min-h-[100dvh] w-full bg-background relative overflow-x-hidden">{children}</div>;
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-4 bg-[#070914] relative overflow-hidden text-foreground">
      {/* Glow Orbs Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className={`w-full ${isCardPage ? "max-w-[430px]" : "max-w-md"} relative z-10 my-auto`}>
        {!isCardPage && (
          <div className="flex items-center justify-center gap-3 mb-5">
            <Image
              src="/mixchat-icon.png"
              alt="Mix Chat Logo"
              width={44}
              height={54}
              priority
              className="h-11 w-auto object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
            />
            <span className="font-black text-xl tracking-widest text-white">
              MIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">CHAT</span>
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}



