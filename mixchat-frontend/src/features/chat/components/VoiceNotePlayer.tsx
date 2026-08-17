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

  const seek = (index: number) => {
    const audio = audioRef.current;
    if (!audio || actualDuration <= 0) return;
    const nextTime = (index / Math.max(1, bars.length - 1)) * actualDuration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const cycleSpeed = () =>
    setSpeed((value) => (value === 1 ? 1.5 : value === 1.5 ? 2 : 1));

  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-2.5 min-w-[210px] max-w-xs border border-white/10 select-none">
      <button
        type="button"
        onClick={() => void togglePlay()}
        disabled={!src}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        className="flex h-9 w-9 items-center justify-center rounded-full gradient-bg-primary text-white shadow-md hover:scale-105 active:scale-95 transition-transform shrink-0 cursor-pointer disabled:opacity-40"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-white" />
        ) : (
          <Play className="h-4 w-4 fill-white ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
        <div
          className="flex items-center gap-0.5 h-6"
          role="slider"
          aria-label="Voice note position"
          aria-valuemin={0}
          aria-valuemax={Math.round(actualDuration)}
          aria-valuenow={Math.round(currentTime)}
        >
          {bars.map((height, index) => {
            const played = index / bars.length <= progress;
            return (
              <button
                type="button"
                key={index}
                onClick={() => seek(index)}
                aria-label={`Seek to ${Math.round((index / bars.length) * actualDuration)} seconds`}
                className={`w-1 min-h-1 rounded-full transition-colors ${played ? "bg-purple-400" : "bg-white/20"}`}
                style={{ height: `${Math.max(12, Math.min(100, height))}%` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(actualDuration)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={cycleSpeed}
        aria-label="Change playback speed"
        className="px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-bold text-purple-300 transition-colors shrink-0 cursor-pointer"
      >
        {speed}x
      </button>
    </div>
  );
};
