"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface VoiceNotePlayerProps {
  duration: number; // in seconds
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      const stepMs = Math.round(300 / speed);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 5;
        });
      }, stepMs);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (progress >= 100) setProgress(0);
      setIsPlaying(true);
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (speed === 1) setSpeed(1.5);
    else if (speed === 1.5) setSpeed(2);
    else setSpeed(1);
  };

  const currentSeconds = Math.floor((duration * progress) / 100);

  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-2.5 min-w-[210px] max-w-xs border border-white/10 select-none">
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        className="flex h-9 w-9 items-center justify-center rounded-full gradient-bg-primary text-white shadow-md hover:scale-105 active:scale-95 transition-transform shrink-0 cursor-pointer"
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
        {/* Waveform Bars Simulation */}
        <div className="flex items-center gap-0.5 h-6">
          {[40, 70, 30, 90, 60, 100, 45, 80, 25, 95, 50, 75, 30, 85, 60, 40].map((height, i) => {
            const isPassed = i * (100 / 16) <= progress;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all ${
                  isPassed
                    ? "bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.5)]"
                    : "bg-white/20"
                } ${isPlaying && isPassed ? "animate-pulse" : ""}`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>0:{currentSeconds < 10 ? `0${currentSeconds}` : currentSeconds}</span>
          <span>0:{duration < 10 ? `0${duration}` : duration}</span>
        </div>
      </div>

      {/* Speed Multiplier Button */}
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
