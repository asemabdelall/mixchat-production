'use client';

import React from 'react';
import Image from 'next/image';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallOverlayProps {
  caller: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  callType: 'VOICE' | 'VIDEO';
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallOverlay({
  caller,
  callType,
  onAccept,
  onDecline,
}: IncomingCallOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between p-6 sm:p-12 bg-slate-950/90 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Incoming Call"
    >
      {/* Top Tag */}
      <div className="flex flex-col items-center gap-2 pt-8">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md shadow-lg">
          {callType === 'VIDEO' ? (
            <Video className="w-4 h-4 text-sky-400 animate-pulse" />
          ) : (
            <Phone className="w-4 h-4 text-emerald-400 animate-pulse" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Incoming {callType === 'VIDEO' ? 'Video' : 'Voice'} Call
          </span>
        </div>
      </div>

      {/* Center: Avatar & Caller Info */}
      <div className="flex flex-col items-center text-center">
        {/* Pulsing Avatar Halo */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-500/40 to-indigo-500/40 blur-2xl animate-ping opacity-60" />
          <div className="absolute -inset-4 rounded-full border border-sky-500/30 animate-pulse" />
          <div className="absolute -inset-8 rounded-full border border-indigo-500/20" />

          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-slate-800">
            {caller.avatarUrl ? (
              <Image
                src={caller.avatarUrl}
                alt={caller.displayName || caller.username}
                fill
                className="object-cover"
                sizes="160px"
                priority
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl font-bold bg-gradient-to-br from-indigo-600 to-sky-500 text-white">
                {(caller.displayName || caller.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
          {caller.displayName || caller.username}
        </h2>
        <p className="text-sm font-medium text-slate-400">
          @{caller.username}
        </p>
      </div>

      {/* Bottom Actions: Decline & Accept */}
      <div className="w-full max-w-sm flex items-center justify-around pb-8 sm:pb-12 gap-8">
        {/* Decline Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onDecline}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-rose-600/90 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 border border-rose-400/30 transition-all cursor-pointer"
            aria-label="Decline Call"
          >
            <PhoneOff className="w-8 h-8" />
          </button>
          <span className="text-xs font-semibold text-rose-300">Decline</span>
        </div>

        {/* Accept Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 border border-emerald-400/40 animate-bounce transition-all cursor-pointer"
            aria-label="Accept Call"
          >
            <Phone className="w-8 h-8" />
          </button>
          <span className="text-xs font-semibold text-emerald-300">Accept</span>
        </div>
      </div>
    </div>
  );
}
