"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Flame,
  Plus,
  X,
  Compass,
  Lock,
  EyeOff,
  Zap,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

interface AnonymousLandingProps {
  onStartSearch: (interests: string[]) => void;
  isLoading?: boolean;
}

const PRESET_TOPICS = [
  { id: "ai_tech", label: "AI & Future Tech", icon: "🔮" },
  { id: "gaming", label: "Gaming & Esports", icon: "🎮" },
  { id: "music", label: "Music & Production", icon: "🎵" },
  { id: "movies", label: "Movies & Anime", icon: "🎬" },
  { id: "chill", label: "Late Night Chill", icon: "☕" },
  { id: "crypto", label: "Web3 & Crypto", icon: "⚡" },
  { id: "fitness", label: "Fitness & Lifestyle", icon: "💪" },
  { id: "philosophy", label: "Deep Talks & Philosophy", icon: "🌌" },
];

export const AnonymousLanding: React.FC<AnonymousLandingProps> = ({
  onStartSearch,
  isLoading = false,
}) => {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [customTopics, setCustomTopics] = useState<string[]>([]);

  const togglePreset = (topicLabel: string) => {
    if (selectedTopics.includes(topicLabel)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topicLabel));
    } else {
      if (selectedTopics.length + customTopics.length < 5) {
        setSelectedTopics([...selectedTopics, topicLabel]);
      }
    }
  };

  const addCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInput.trim();
    if (!clean) return;
    if (
      !customTopics.includes(clean) &&
      !selectedTopics.includes(clean) &&
      selectedTopics.length + customTopics.length < 5
    ) {
      setCustomTopics([...customTopics, clean]);
      setCustomInput("");
    }
  };

  const removeCustomTopic = (topic: string) => {
    setCustomTopics(customTopics.filter((t) => t !== topic));
  };

  const handleStart = () => {
    const all = [...selectedTopics, ...customTopics];
    onStartSearch(all);
  };

  const totalSelected = selectedTopics.length + customTopics.length;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(var(--app-viewport-height)-5rem)] max-w-4xl mx-auto px-4 py-8 text-center select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-purple-950/20"
      >
        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold tracking-wide uppercase mb-6 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>MixChat Ghost Radar</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
          Anonymous{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
            Matching
          </span>
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto mb-8 font-medium leading-relaxed">
          Connect instantly with strangers worldwide based on shared interests.
          100% ephemeral and private until you both agree to reveal.
        </p>

        {/* Interest Selection Section */}
        <div className="text-left mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Pick Your Interests ({totalSelected}/5)
            </span>
            {totalSelected > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTopics([]);
                  setCustomTopics([]);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Topic Pills Grid */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_TOPICS.map((preset) => {
              const isSelected = selectedTopics.includes(preset.label);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => togglePreset(preset.label)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 border ${
                    isSelected
                      ? "bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-900/30 scale-105"
                      : "bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              );
            })}

            {/* Custom Topics Pills */}
            {customTopics.map((custom) => (
              <span
                key={custom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-cyan-600/20 border border-cyan-500/40 text-cyan-200 shadow-sm"
              >
                <span>🏷️ {custom}</span>
                <button
                  type="button"
                  onClick={() => removeCustomTopic(custom)}
                  className="hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          {/* Custom Topic Input */}
          <form
            onSubmit={addCustomTopic}
            className="relative flex items-center gap-2"
          >
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Or type custom interest (e.g. Photography, Startup, F1)..."
              maxLength={25}
              disabled={totalSelected >= 5}
              className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-white placeholder:text-white/35 focus:outline-none focus-visible:outline-none focus:border-purple-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 transition-all duration-200 disabled:opacity-40"
            />
            <Button
              type="submit"
              variant="glass"
              size="sm"
              disabled={!customInput.trim() || totalSelected >= 5}
              className="shrink-0 h-9 px-3 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </Button>
          </form>
        </div>

        {/* Primary Find Match CTA */}
        <Button
          onClick={handleStart}
          disabled={isLoading}
          className="w-full py-4 text-base font-bold rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:via-pink-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-900/40 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <Flame className="w-5 h-5 text-amber-300 animate-bounce" />
          <span>
            {totalSelected > 0 ? "Find Interest Match" : "Find Random Stranger"}
          </span>
          <Zap className="w-4 h-4 text-cyan-300" />
        </Button>

        {/* Privacy Invariant Assurance Footer */}
        <div className="mt-8 pt-6 border-t border-zinc-800/60 grid grid-cols-3 gap-3 text-left">
          <div className="flex items-start gap-2.5">
            <EyeOff className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-zinc-200">
                Total Anonymity
              </p>
              <p className="text-[10px] text-zinc-500">
                Real name & profile hidden
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-zinc-200">
                Mutual Reveal
              </p>
              <p className="text-[10px] text-zinc-500">
                Only revealed if both agree
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-zinc-200">
                Safe & Guarded
              </p>
              <p className="text-[10px] text-zinc-500">1-tap anonymous block</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
