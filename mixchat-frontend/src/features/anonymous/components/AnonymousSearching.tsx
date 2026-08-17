"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, X, Sparkles, Compass } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

interface AnonymousSearchingProps {
  interests: string[];
  joinedAt?: string | null;
  onCancel: () => void;
  isLoading?: boolean;
}

export const AnonymousSearching: React.FC<AnonymousSearchingProps> = ({
  interests,
  onCancel,
  isLoading = false,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] max-w-xl mx-auto px-4 py-8 text-center select-none">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

      {/* Radar Animation Container */}
      <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
        {/* Pulsing Concentric Rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.9,
              ease: "easeOut",
            }}
            className="absolute inset-0 rounded-full border border-purple-500/40 pointer-events-none"
          />
        ))}

        {/* Outer Ring */}
        <div className="absolute inset-4 rounded-full border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md" />

        {/* Rotating Radar Sweep */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 rounded-full pointer-events-none"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(168, 85, 247, 0.4) 360deg)",
          }}
        />

        {/* Center Icon */}
        <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-900/50 border border-purple-400/40">
          <Radio className="w-9 h-9 text-white animate-pulse" />
        </div>
      </div>

      {/* Searching Status Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3 h-3 animate-spin" />
          <span>Searching Ghost Radar</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Finding Your Partner...
        </h2>

        <p className="text-zinc-400 text-xs sm:text-sm max-w-sm mx-auto font-medium">
          {interests.length > 0
            ? "Looking for active users who share your chosen interests."
            : "Looking for an active random conversational partner."}
        </p>

        {/* Search Duration Timer */}
        <div className="text-xs font-mono text-zinc-500 font-semibold tracking-wider">
          TIME ELAPSED:{" "}
          <span className="text-purple-400">{formatTimer(elapsedSeconds)}</span>
        </div>

        {/* Selected Interests Chips */}
        {interests.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Compass className="w-3 h-3" /> Filters:
            </span>
            {interests.map((topic) => (
              <span
                key={topic}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-800/60 border border-zinc-700/60 text-zinc-300"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Cancel Search Button */}
      <Button
        onClick={onCancel}
        disabled={isLoading}
        variant="glass"
        size="default"
        className="px-6 rounded-2xl border-zinc-700/80 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2"
      >
        <X className="w-4 h-4 text-zinc-400" />
        <span>Cancel Matchmaking</span>
      </Button>
    </div>
  );
};
