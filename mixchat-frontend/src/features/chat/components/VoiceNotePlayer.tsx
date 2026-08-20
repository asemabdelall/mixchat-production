"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

interface VoiceNotePlayerProps {
  src?: string;
  duration: number;
  waveform?: number[];
}

const FALLBACK_WAVEFORM = [
  40, 70, 30, 90, 60, 100, 45, 80, 25, 95, 50, 75, 30, 85, 60, 40,
];

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
};

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  src,
  duration,
  waveform,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const bars = useMemo(
    () => (waveform?.length ? waveform : FALLBACK_WAVEFORM),
    [waveform],
  );
  const progress =
    actualDuration > 0 ? Math.min(1, currentTime / actualDuration) : 0;

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) setActualDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const seekFromPointer = (event: React.MouseEvent<HTMLButtonElement>) => {
    const audio = audioRef.current;
    if (!audio || actualDuration <= 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width),
    );
    const nextTime = ratio * actualDuration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const cycleSpeed = () =>
    setSpeed((value) => (value === 1 ? 1.5 : value === 1.5 ? 2 : 1));

  return (
    <div className="flex min-w-[220px] max-w-xs items-center gap-3 rounded-2xl bg-white/10 p-2.5 select-none">
      <button
        type="button"
        onClick={() => void togglePlay()}
        disabled={!src}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        className="gradient-bg-primary flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-white" aria-hidden="true" />
        ) : (
          <Play className="ml-0.5 h-4 w-4 fill-white" aria-hidden="true" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
        <button
          type="button"
          onClick={seekFromPointer}
          className="flex h-8 w-full cursor-pointer items-center gap-0.5 rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
          aria-label={`Seek voice note. ${formatDuration(currentTime)} of ${formatDuration(actualDuration)}`}
        >
          {bars.map((height, index) => {
            const played = index / bars.length <= progress;
            return (
              <span
                key={index}
                className={`min-h-1 flex-1 rounded-full transition-colors ${played ? "bg-purple-400" : "bg-white/20"}`}
                style={{ height: `${Math.max(12, Math.min(100, height))}%` }}
              />
            );
          })}
        </button>
        <div className="flex items-center justify-between text-xs font-medium tabular-nums text-muted-foreground">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(actualDuration)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={cycleSpeed}
        aria-label="Change playback speed"
        className="min-h-10 shrink-0 cursor-pointer rounded-xl bg-white/10 px-2 text-xs font-bold text-purple-200 transition-colors hover:bg-white/20 active:bg-white/25"
      >
        {speed}x
      </button>
    </div>
  );
};
