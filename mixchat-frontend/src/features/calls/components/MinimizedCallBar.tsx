'use client';

import React from 'react';
import { AvatarImage } from '@/shared/components/ui/AvatarImage';
import { Maximize2, PhoneOff, Phone, Video } from 'lucide-react';
import type { CallParticipantDto } from '@/services/calls/callsService';

interface MinimizedCallBarProps {
  partner?: CallParticipantDto;
  callType: 'VOICE' | 'VIDEO';
  status: string;
  duration: number;
  onRestore: () => void;
  onEndCall: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function MinimizedCallBar({
  partner,
  callType,
  status,
  duration,
  onRestore,
  onEndCall,
}: MinimizedCallBarProps) {
  const name = partner?.displayName || partner?.username || 'MixChat User';

  return (
    <aside
      aria-label="Active Call Pill"
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[99998] flex items-center gap-3 p-2 pr-3 bg-slate-950/90 text-white rounded-full shadow-2xl border border-white/15 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200"
    >
      {/* Avatar with status dot */}
      <div
        className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-slate-800 cursor-pointer"
        onClick={onRestore}
      >
        <AvatarImage
          src={partner?.avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950" />
      </div>

      {/* Info & Duration */}
      <button
        type="button"
        onClick={onRestore}
        className="flex flex-col text-left cursor-pointer focus:outline-none"
      >
        <span className="text-xs font-semibold text-white max-w-[110px] truncate">
          {name}
        </span>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
          {callType === 'VIDEO' ? (
            <Video className="w-3 h-3 text-sky-400" />
          ) : (
            <Phone className="w-3 h-3 text-emerald-400" />
          )}
          <span>
            {status === 'RINGING' ? 'Ringing...' : formatDuration(duration)}
          </span>
        </div>
      </button>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 ml-1">
        <button
          type="button"
          onClick={onRestore}
          className="p-2 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 text-slate-300 transition-colors"
          title="Restore Call"
          aria-label="Maximize"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onEndCall}
          className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white transition-colors"
          title="End Call"
          aria-label="End"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
