"use client";

import React from "react";
import Image from "next/image";

export const AuthShowcase: React.FC = () => {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-10 lg:p-14 xl:p-20 overflow-hidden select-none">
      {/* Header / Brand Identity */}
      <div className="relative z-10">
        <div className="flex items-center gap-3.5 mb-8">
          <div className="relative flex items-center justify-center p-2.5 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.35)]">
            <Image
              src="/mixchat-icon.png"
              alt="MixChat Icon"
              width={42}
              height={42}
              priority
              className="w-10 h-10 object-contain drop-shadow-[0_0_14px_rgba(168,85,247,0.6)]"
            />
          </div>
          <div>
            <span className="text-2xl font-black tracking-[0.2em] text-white">
              MIX<span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">CHAT</span>
            </span>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Connect • Share • Be You</p>
          </div>
        </div>

        <h1 className="text-3xl xl:text-5xl font-black text-white tracking-tight leading-[1.15] mt-8">
          Connect, create, and share <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 bg-clip-text text-transparent">
            with the people you love.
          </span>
        </h1>
        <p className="text-sm xl:text-base text-slate-300/80 max-w-lg mt-4 leading-relaxed">
          Experience instant messaging, vibrant reels, and daily stories all in one place.
        </p>
      </div>

      {/* Simple Clean Footer */}
      <div className="relative z-10 text-xs text-slate-400">
        <span>© {new Date().getFullYear()} MixChat. All rights reserved.</span>
      </div>
    </div>
  );
};
