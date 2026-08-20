'use client';

import React, { useMemo, useState } from 'react';
import { AvatarImage } from '@/shared/components/ui/AvatarImage';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useLocalParticipant,
  useConnectionState,
  isTrackReference,
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Minimize2,
  Loader2,
} from 'lucide-react';
import type { CallParticipantDto } from '@/services/calls/callsService';

interface VideoCallScreenProps {
  partner?: CallParticipantDto;
  duration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  livekitServerUrl?: string | null;
  livekitToken?: string | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onMinimize: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function VideoCallLayout({
  partner,
  duration,
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  onMinimize,
}: VideoCallScreenProps) {
  const name = partner?.displayName || partner?.username || 'MixChat User';
  const connectionState = useConnectionState();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  const [isTogglingCamera, setIsTogglingCamera] = useState(false);
  const [isTogglingMic, setIsTogglingMic] = useState(false);
  const [isTogglingScreen, setIsTogglingScreen] = useState(false);

  // Direct toggle actions directly interfacing with LiveKit local participant
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

  const handleToggleCamera = async () => {
    if (isTogglingCamera) return;
    setIsTogglingCamera(true);
    try {
      if (localParticipant) {
        await localParticipant.setCameraEnabled(!isCameraEnabled);
      }
      onToggleVideo();
    } catch {
      // Ignore
    } finally {
      setIsTogglingCamera(false);
    }
  };

  const handleToggleScreenShare = async () => {
    if (isTogglingScreen) return;
    setIsTogglingScreen(true);
    try {
      if (localParticipant) {
        await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
      }
      onToggleScreenShare();
    } catch {
      // Ignore
    } finally {
      setIsTogglingScreen(false);
    }
  };

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const remoteScreenTrack = useMemo(
    () =>
      tracks.find(
        (t) => !t.participant.isLocal && t.source === Track.Source.ScreenShare,
      ),
    [tracks],
  );

  const remoteCameraTrack = useMemo(
    () =>
      tracks.find(
        (t) => !t.participant.isLocal && t.source === Track.Source.Camera,
      ),
    [tracks],
  );

  const activeRemoteTrack = remoteScreenTrack || remoteCameraTrack;

  const localCameraTrack = useMemo(
    () =>
      tracks.find(
        (t) => t.participant.isLocal && t.source === Track.Source.Camera,
      ),
    [tracks],
  );

  const isRemoteVideoLive = Boolean(
    activeRemoteTrack &&
      activeRemoteTrack.publication &&
      !activeRemoteTrack.publication.isMuted,
  );

  // Authoritative camera / mic state from local participant
  const cameraActive = typeof isCameraEnabled === 'boolean' ? isCameraEnabled : !isVideoOff;
  const micActive = typeof isMicrophoneEnabled === 'boolean' ? isMicrophoneEnabled : !isMuted;
  const screenActive = typeof isScreenShareEnabled === 'boolean' ? isScreenShareEnabled : isScreenSharing;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col justify-between bg-slate-950 text-white select-none animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Active Video Call"
    >
      {/* 1. Main Remote Video Stage */}
      <div className="relative flex-1 w-full h-full bg-slate-900 overflow-hidden flex items-center justify-center">
        {isRemoteVideoLive && activeRemoteTrack && isTrackReference(activeRemoteTrack) ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <VideoTrack
              trackRef={activeRemoteTrack}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            {/* Pulsing Avatar Placeholder */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl mb-4 bg-slate-800">
              <AvatarImage
                src={partner?.avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">{name}</h3>

            {connectionState === ConnectionState.Connecting ? (
              <p className="text-xs text-sky-400 flex items-center gap-1.5 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Connecting to media stream...
              </p>
            ) : (
              <p className="text-xs text-slate-400 font-medium">
                {name}&apos;s camera is off
              </p>
            )}
          </div>
        )}

        {/* 2. Floating Local Camera Picture-in-Picture (PiP) */}
        <div className="absolute top-20 right-4 sm:top-24 sm:right-6 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-950 z-20 transition-all">
          {cameraActive && localCameraTrack && isTrackReference(localCameraTrack) ? (
            <VideoTrack
              trackRef={localCameraTrack}
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/90 text-slate-400 text-[10px] p-2 text-center select-none">
              <VideoOff className="w-5 h-5 mb-1.5 text-slate-500" />
              <span>Camera Off</span>
            </div>
          )}
        </div>

        {/* 3. Floating Top Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-auto">
          <button
            type="button"
            onClick={onMinimize}
            className="p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900/90 backdrop-blur-md active:scale-95 text-slate-200 border border-white/10 transition-colors"
            title="Minimize Call"
            aria-label="Minimize"
          >
            <Minimize2 className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg">
            <span className="text-xs font-semibold text-white">{name}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectionState === ConnectionState.Connected
                  ? 'bg-emerald-400'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-xs font-mono text-emerald-400">
              {formatDuration(duration)}
            </span>
          </div>

          <div className="w-10" />
        </div>
      </div>

      {/* 4. Bottom Glassmorphic Controls Dock */}
      <div className="w-full bg-slate-950/80 backdrop-blur-xl border-t border-white/10 p-4 sm:p-6 flex items-center justify-center gap-4 sm:gap-6 z-20">
        {/* Mute / Unmute Mic Button */}
        <button
          type="button"
          onClick={handleToggleMic}
          disabled={isTogglingMic}
          className={`p-3.5 sm:p-4 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            !micActive
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20'
              : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
          }`}
          title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
          aria-label="Toggle Mute"
        >
          {!micActive ? (
            <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </button>

        {/* Video On / Off Button */}
        <button
          type="button"
          onClick={handleToggleCamera}
          disabled={isTogglingCamera}
          className={`p-3.5 sm:p-4 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            !cameraActive
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg shadow-rose-500/20'
              : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
          }`}
          title={cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
          aria-label="Toggle Video"
        >
          {!cameraActive ? (
            <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </button>

        {/* Screen Share Button */}
        <button
          type="button"
          onClick={handleToggleScreenShare}
          disabled={isTogglingScreen}
          className={`p-3.5 sm:p-4 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            screenActive
              ? 'bg-sky-500/30 text-sky-400 border border-sky-500/50 shadow-lg shadow-sky-500/20'
              : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
          }`}
          title={screenActive ? 'Stop Screen Share' : 'Share Screen'}
          aria-label="Toggle Screen Share"
        >
          <ScreenShare className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* End Call Button */}
        <button
          type="button"
          onClick={onEndCall}
          className="px-6 py-3.5 sm:py-4 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/40 border border-rose-400/40 transition-all cursor-pointer"
          title="End Call"
          aria-label="End Call"
        >
          <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-xs sm:text-sm font-medium">End</span>
        </button>
      </div>
    </div>
  );
}

export function VideoCallScreen(props: VideoCallScreenProps) {
  if (!props.livekitServerUrl || !props.livekitToken) {
    return (
      <div
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white select-none p-6 text-center animate-in fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Connecting to Video Call"
      >
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-sky-500/30 shadow-2xl mb-6 bg-slate-800 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-1.5">
          Connecting Media Room...
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mb-8">
          Setting up encrypted real-time video session with LiveKit Cloud
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
      video={true}
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      <VideoCallLayout {...props} />
    </LiveKitRoom>
  );
}
