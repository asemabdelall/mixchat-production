'use client';

import React, { useState } from 'react';
import { AvatarImage } from '@/shared/components/ui/AvatarImage';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Minimize2,
  Phone,
} from 'lucide-react';
import type { CallParticipantDto } from '@/services/calls/callsService';

interface VoiceCallScreenProps {
  partner?: CallParticipantDto;
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  livekitServerUrl?: string | null;
  livekitToken?: string | null;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
  onMinimize: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function VoiceCallLayout({
  partner,
  duration,
  isMuted,
  isSpeakerOn,
  onToggleMute,
  onToggleSpeaker,
  onEndCall,
  onMinimize,
}: VoiceCallScreenProps) {
  const name = partner?.displayName || partner?.username || 'MixChat User';
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [isTogglingMic, setIsTogglingMic] = useState(false);

  const handleToggleMic = async () => {
    if (isTogglingMic) return;
    setIsTogglingMic(true);
    try {
      if (localParticipant) {
        await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      }
      onToggleMute();
    } catch {
      // Ignore
    } finally {
      setIsTogglingMic(false);
    }
  };

  const micActive = typeof isMicrophoneEnabled === 'boolean' ? isMicrophoneEnabled : !isMuted;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between p-6 sm:p-12 bg-slate-950/95 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Active Voice Call"
    >
      {/* Top Bar: Minimize, Call Type & Duration */}
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

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-semibold text-emerald-400 mb-1">
            <Phone className="w-3 h-3 animate-pulse" />
            <span>Voice Call</span>
          </div>
          <span className="text-sm font-mono font-medium tracking-wider text-slate-300">
            {formatDuration(duration)}
          </span>
        </div>

        <div className="w-10" />
      </div>

      {/* Center: Avatar & Sound Wave Visualization */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-6">
          {/* Ambient breathing glow */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />

          {/* Sound wave rings */}
          <div className="absolute -inset-4 rounded-full border border-emerald-500/20 animate-ping opacity-30 duration-1000" />
          <div className="absolute -inset-8 rounded-full border border-emerald-500/10" />

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
          <p className="text-sm font-medium text-slate-400 mb-4">
            @{partner.username}
          </p>
        )}

        {/* Dynamic Voice Bars Indicator */}
        <div className="flex items-center gap-1.5 h-6">
          <span className="w-1 h-3 bg-emerald-400/70 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-5 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-6 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
          <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:200ms]" />
          <span className="w-1 h-2 bg-emerald-400/70 rounded-full animate-bounce [animation-delay:50ms]" />
        </div>
      </div>

      {/* Bottom Controls Dock */}
      <div className="w-full max-w-sm flex items-center justify-around pb-8 sm:pb-12 gap-4">
        {/* Mute Button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleMic}
            disabled={isTogglingMic}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              !micActive
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
            }`}
            title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
            aria-label="Toggle Mute"
          >
            {!micActive ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
          <span className="text-[11px] font-medium text-slate-400">
            {!micActive ? 'Muted' : 'Mute'}
          </span>
        </div>

        {/* End Call Button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onEndCall}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 border border-rose-400/40 transition-all cursor-pointer"
            title="End Call"
            aria-label="End Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
          <span className="text-[11px] font-medium text-rose-400">End</span>
        </div>

        {/* Speaker Button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleSpeaker}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isSpeakerOn
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
            }`}
            title={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
            aria-label="Toggle Speaker"
          >
            {isSpeakerOn ? (
              <Volume2 className="w-6 h-6" />
            ) : (
              <VolumeX className="w-6 h-6" />
            )}
          </button>
          <span className="text-[11px] font-medium text-slate-400">
            Speaker
          </span>
        </div>
      </div>
    </div>
  );
}

export function VoiceCallScreen(props: VoiceCallScreenProps) {
  if (!props.livekitServerUrl || !props.livekitToken) {
    return (
      <div
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white select-none p-6 text-center animate-in fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Connecting to Voice Call"
      >
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-2xl mb-6 bg-slate-800 flex items-center justify-center">
          <Phone className="w-10 h-10 animate-pulse text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-1.5">
          Connecting Audio Room...
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mb-8">
          Setting up encrypted real-time audio session with LiveKit Cloud
        </p>
        <button
          type="button"
          onClick={props.onEndCall}
          className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/40 cursor-pointer"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Cancel</span>
        </button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={props.livekitServerUrl}
      token={props.livekitToken}
      connect={true}
      audio={true}
      video={false}
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      <VoiceCallLayout {...props} />
    </LiveKitRoom>
  );
}
