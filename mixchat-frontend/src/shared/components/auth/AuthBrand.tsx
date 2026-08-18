"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

interface AuthBrandProps {
  compact?: boolean;
}

export const AuthBrand: React.FC<AuthBrandProps> = ({ compact = false }) => {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "mb-3" : "mb-5"}`}>
      <Link href="/" className="group flex flex-col items-center">
        <div className="relative mb-2 flex items-center justify-center">
          <div className="absolute inset-0 bg-purple-500/25 rounded-full blur-2xl scale-150 pointer-events-none group-hover:bg-purple-500/40 transition-all duration-300" />
          <Image
            src="/mixchat-icon.png"
            alt="MixChat Official Logo"
            width={72}
            height={86}
            priority
            className="relative w-[60px] sm:w-[72px] h-auto object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-[0.2em] text-white flex items-center gap-1.5 uppercase">
          <span>MIX</span>
          <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            CHAT
          </span>
        </h1>
      </Link>
      <p className="text-xs text-slate-400 mt-1 font-medium">Connect • Share • Experience</p>
    </div>
  );
};
