"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";
import { Sparkles, MessageCircle, ShieldCheck, MapPin } from "lucide-react";

export default function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-4">

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Connect. Share. <br />
          <span className="gradient-text">Be You.</span>
        </h1>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Meet new people, share moments, and build real connections with total privacy control.
        </p>
      </div>

      {/* Feature Grid Pills */}
      <div className="grid grid-cols-2 gap-3 w-full my-4 text-left">
        <div className="glass-card p-3 rounded-2xl border border-white/10 flex items-center gap-2.5">
          <div className="p-2 rounded-xl gradient-bg-primary text-white">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Real-Time Chat</p>
            <p className="text-[10px] text-muted-foreground">HD voice & video</p>
          </div>
        </div>

        <div className="glass-card p-3 rounded-2xl border border-white/10 flex items-center gap-2.5">
          <div className="p-2 rounded-xl gradient-bg-accent text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Anon Mode</p>
            <p className="text-[10px] text-muted-foreground">Safe identity reveal</p>
          </div>
        </div>

        <div className="glass-card p-3 rounded-2xl border border-white/10 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Ghost Mode</p>
            <p className="text-[10px] text-muted-foreground">Map privacy control</p>
          </div>
        </div>

        <div className="glass-card p-3 rounded-2xl border border-white/10 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Live Social Map</p>
            <p className="text-[10px] text-muted-foreground">Find friends nearby</p>
          </div>
        </div>
      </div>

      <div className="w-full space-y-3 pt-2">
        <Link href="/register" className="block w-full">
          <Button size="lg" className="w-full h-13 font-bold text-base shadow-xl shadow-purple-500/30">
            Get Started
          </Button>
        </Link>

        <Link href="/login" className="block w-full">
          <Button variant="glass" size="lg" className="w-full h-13 font-medium text-sm text-gray-300">
            Log In
          </Button>
        </Link>
      </div>

      <div className="pt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span>Don&apos;t have an account? <Link href="/register" className="text-purple-400 font-bold hover:underline">Sign Up</Link></span>
      </div>
    </div>
  );
}
