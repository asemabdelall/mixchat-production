"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Rocket, ArrowRight, ShieldCheck, Lock, UserCheck, Heart, MapPin, Sparkles } from "lucide-react";

export default function SplashPage() {
  return (
    <div className="min-h-screen w-full bg-[#060814] text-white relative overflow-x-hidden flex flex-col items-center justify-between p-4 sm:p-6 py-8 select-none">
      {/* Background Lighting & Glow Orbs */}
      <div className="absolute top-12 -left-20 w-80 h-80 rounded-full bg-purple-600/25 blur-[120px] pointer-events-none" />
      <div className="absolute top-48 -right-20 w-80 h-80 rounded-full bg-cyan-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-indigo-600/20 blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between items-center relative z-10 space-y-6">

        {/* 1. BRANDING & LOGO */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center pt-2"
        >
          <div className="relative mb-3 flex items-center justify-center">
            {/* Soft Ambient Radial Backdrop */}
            <div className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-purple-600/40 via-indigo-500/30 to-cyan-400/30 blur-2xl animate-pulse" />
            <img
              src="/mixchat-icon.png"
              alt="Mix Chat"
              className="h-28 sm:h-32 w-auto object-contain relative z-10 drop-shadow-[0_0_30px_rgba(168,85,247,0.55)]"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-[0.22em] text-white uppercase drop-shadow-md">
            MIX CHAT
          </h1>
          <p className="text-[10px] sm:text-xs font-extrabold tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400 uppercase mt-1">
            Connect Freely
          </p>
        </motion.div>

        {/* 2. HERO HEADLINE & SUBTITLE */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-center space-y-2 px-2"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            <span className="text-white">Connect. </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">Share. </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300">Be You.</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xs mx-auto">
            Chat, share moments, discover people<br />and stay connected — your way.
          </p>
        </motion.div>

        {/* 3. ENHANCED SOCIAL VISUAL COMPOSITION */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="w-full max-w-sm relative my-3 py-7 flex items-center justify-center select-none"
        >
          {/* Ambient Backlight Glow for Social Graphic */}
          <div className="absolute inset-0 w-64 h-64 mx-auto rounded-full bg-gradient-to-tr from-purple-600/35 via-pink-500/25 to-cyan-500/25 blur-3xl pointer-events-none" />

          {/* SVG Smooth Orbital Rings Backdrop */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 360 160"
            fill="none"
          >
            <ellipse
              cx="180"
              cy="80"
              rx="155"
              ry="62"
              stroke="url(#orbitGradient1)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="opacity-50"
            />
            <ellipse
              cx="180"
              cy="80"
              rx="120"
              ry="46"
              stroke="url(#orbitGradient2)"
              strokeWidth="1"
              strokeDasharray="3 5"
              className="opacity-40"
            />
            <defs>
              <linearGradient id="orbitGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="orbitGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Floating Sparkle Stars & Particles */}
          <div className="absolute top-1 left-8 text-cyan-300 text-sm animate-pulse">✦</div>
          <div className="absolute top-4 right-10 text-purple-300 text-sm animate-pulse">✨</div>
          <div className="absolute bottom-3 left-12 text-pink-400 text-xs animate-pulse">✨</div>
          <div className="absolute bottom-4 right-8 text-cyan-400 text-xs animate-pulse">✦</div>
          <div className="absolute top-10 left-28 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
          <div className="absolute bottom-8 right-28 w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_10px_#ec4899]" />

          {/* Top-Left Speech Bubble */}
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-3 glass-card bg-slate-900/90 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-cyan-400/40 shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center gap-1.5 z-20"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-indigo-400" />
            <div className="w-2 h-2 rounded-full bg-purple-400" />
          </motion.div>

          {/* Top-Right Glowing Purple Heart Badge */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            className="absolute top-1 right-5 glass-card bg-slate-900/90 backdrop-blur-xl p-3 rounded-2xl border border-purple-400/40 shadow-[0_4px_20px_rgba(168,85,247,0.35)] z-20"
          >
            <Heart className="h-4.5 w-4.5 text-purple-400 fill-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          </motion.div>

          {/* Bottom-Left Glowing Pink Heart Speech Bubble */}
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="absolute bottom-0 left-5 glass-card bg-slate-900/90 backdrop-blur-xl p-3 rounded-2xl border border-pink-500/40 shadow-[0_4px_20px_rgba(236,72,153,0.35)] z-20"
          >
            <Heart className="h-4.5 w-4.5 text-pink-500 fill-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
          </motion.div>

          {/* Bottom-Right Location Pin Badge */}
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            className="absolute bottom-1 right-3 glass-card bg-slate-900/90 backdrop-blur-xl p-3 rounded-2xl border border-cyan-400/40 shadow-[0_4px_20px_rgba(6,182,212,0.35)] z-20"
          >
            <MapPin className="h-4.5 w-4.5 text-cyan-400 fill-cyan-400/30 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </motion.div>

          {/* Center 3 Overlapping Avatars */}
          <div className="flex items-center justify-center relative z-10 -space-x-4">
            {/* Left Avatar */}
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-[0_0_18px_rgba(6,182,212,0.55)] shrink-0 transform -rotate-6 transition-transform hover:scale-105">
              <div className="w-full h-full rounded-full overflow-hidden border border-black">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Middle Avatar (Larger Primary) */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full p-[3px] bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 shadow-[0_0_28px_rgba(236,72,153,0.65)] shrink-0 relative z-20 scale-105 transition-transform hover:scale-110">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                <img
                  src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80"
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right Avatar */}
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full p-[2px] bg-gradient-to-tr from-blue-400 to-cyan-400 shadow-[0_0_18px_rgba(56,189,248,0.55)] shrink-0 transform rotate-6 transition-transform hover:scale-105">
              <div className="w-full h-full rounded-full overflow-hidden border border-black">
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80"
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 4. CALL-TO-ACTION BUTTONS */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="w-full max-w-sm mx-auto space-y-2.5 pt-1"
        >
          {/* Primary CTA: Get Started */}
          <Link href="/register" className="block w-full">
            <button
              type="button"
              className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-bold text-sm sm:text-base flex items-center justify-between px-5 shadow-lg shadow-purple-600/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Rocket className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-white group-hover:rotate-12 transition-transform" />
                <span>Get Started</span>
              </div>
              <ArrowRight className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>

          {/* Secondary CTA: Log In */}
          <Link href="/login" className="block w-full">
            <div className="w-full h-10 sm:h-11 rounded-xl sm:rounded-2xl glass-card bg-slate-900/60 border border-white/15 hover:bg-white/10 flex items-center justify-between px-5 text-xs font-medium transition-all active:scale-[0.98] cursor-pointer group">
              <span className="text-slate-300">
                Already have an account? <strong className="text-purple-400 group-hover:text-purple-300 transition-colors">Log In</strong>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        {/* 5. TRUST & PRIVACY BAR */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="pt-2 pb-1"
        >
          <div className="glass-card bg-slate-900/40 border border-white/10 px-4 py-2.5 rounded-full text-[11px] sm:text-xs text-slate-400 font-medium flex items-center justify-center gap-3 sm:gap-4 shadow-inner">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              Private
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-cyan-400" />
              Secure
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-pink-400" />
              You&apos;re in control
            </span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
