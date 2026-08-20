'use client';

import React from 'react';
import { AvatarImage } from '@/shared/components/ui/AvatarImage';
import { PhoneOff, Minimize2, Video, Phone } from 'lucide-react';
import type { CallParticipantDto } from '@/services/calls/callsService';

interface OutgoingCallOverlayProps {
  partner?: CallParticipantDto;
  callType: 'VOICE' | 'VIDEO';
  statusMessage: string;
  onCancel: () => void;
  onMinimize: () => void;
}

export function OutgoingCallOverlay({
  partner,
  callType,
  statusMessage,
  onCancel,
  onMinimize,
}: OutgoingCallOverlayProps) {
  const name = partner?.displayName || partner?.username || 'Contact';

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between p-6 sm:p-12 bg-slate-950/92 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Outgoing Call"
    >
      {/* Top Header: Minimize & Call Type */}
      <div className="w-full flex items-center justify-between pt-4 max-w-md">
        <button
          type="button"
          onClick={onMinimize}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 text-slate-300 transition-colors"
          title="Minimize Call"
          aria-label="Minimize"
        >
          <Minimize2 className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-200">
          {callType === 'VIDEO' ? (
            <Video className="w-3.5 h-3.5 text-sky-400" />
          ) : (
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Outgoing {callType === 'VIDEO' ? 'Video' : 'Voice'}</span>
        </div>

        <div className="w-10" />
      </div>

      {/* Center Avatar & Pulse */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-500/30 to-indigo-500/30 blur-2xl animate-pulse" />
          <div className="absolute -inset-4 rounded-full border border-sky-500/20 animate-ping opacity-40 duration-1000" />
          <div className="absolute -inset-8 rounded-full border border-indigo-500/10" />

          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-slate-800">
            <AvatarImage
              src={partner?.avatarUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
          {name}
        </h2>
        {partner?.username && (
          <p className="text-sm font-medium text-slate-400 mb-3">
            @{partner.username}
          </p>
        )}
        <p className="text-sm font-semibold tracking-wide text-sky-400 animate-pulse">
          {statusMessage}
        </p>
      </div>

      {/* Bottom End Call */}
      <div className="flex flex-col items-center pb-8 sm:pb-12 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-rose-600/90 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 border border-rose-400/30 transition-all cursor-pointer"
          aria-label="End Call"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
        <span className="text-xs font-semibold text-rose-300">Cancel</span>
      </div>
    </div>
  );
}
