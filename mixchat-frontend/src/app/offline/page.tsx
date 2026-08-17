"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground selection:bg-purple-500 selection:text-white">
      <Card className="max-w-md w-full glass-panel p-8 shadow-2xl border-white/10 text-center space-y-6">
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-purple-600/20 blur-xl animate-pulse" />
          <Image
            src="/mixchat-icon.png"
            alt="Mix Chat"
            width={64}
            height={64}
            className="relative z-10 w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
          <WifiOff className="h-3.5 w-3.5" />
          <span>No Internet Connection</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            You&apos;re Offline
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mix Chat requires an active network connection to send messages,
            load feed updates, and sync social activity.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleReload}
            className="w-full h-11 text-sm font-semibold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Connection</span>
          </Button>

          <Link href="/">
            <Button
              variant="outline"
              className="w-full h-11 text-sm font-semibold border-white/10 text-white hover:bg-white/5 flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              <span>Go to Home</span>
            </Button>
          </Link>
        </div>

        <p className="text-[10px] text-muted-foreground/60 pt-2">
          Mix Chat PWA Foundation • Status: Disconnected
        </p>
      </Card>
    </div>
  );
}
