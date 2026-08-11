"use client";

import React from "react";
import Image from "next/image";

export const AuthBrand: React.FC = () => {
  return (
    <div className="flex flex-col items-center text-center mb-3">
      <div className="relative mb-2.5 flex items-center justify-center">
        <div className="absolute inset-0 bg-purple-500/25 rounded-full blur-2xl scale-150 pointer-events-none" />
        <Image
          src="/mixchat-icon.png"
          alt="Mix Chat Official Logo"
          width={92}
          height={110}
          priority
          className="relative w-[78px] sm:w-[92px] h-auto object-contain drop-shadow-[0_0_22px_rgba(168,85,247,0.45)]"
        />
      </div>
      <h1 className="text-lg sm:text-xl font-black tracking-[0.2em] text-white flex items-center gap-1.5 uppercase">
        <span>MIX</span>
        <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
          CHAT
        </span>
      </h1>
      <p className="text-xs text-slate-400 mt-0.5">
        Connect. Share. Be You.
      </p>
    </div>
  );
};
