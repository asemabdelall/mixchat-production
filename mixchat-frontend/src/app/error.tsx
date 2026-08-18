"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MixChat ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-app-viewport flex items-center justify-center p-4 bg-background text-foreground selection:bg-purple-500 selection:text-white">
      <Card className="max-w-md w-full glass-panel p-8 shadow-2xl border-white/10 text-center space-y-6">
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-rose-600/20 blur-xl animate-pulse" />
          <Image
            src="/mixchat-icon.png"
            alt="Mix Chat"
            width={64}
            height={64}
            className="relative z-10 w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Something went wrong</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Temporary Glitch
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We encountered an unexpected issue while rendering this screen. You
            can try reloading or return to the feed.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full h-11 text-sm font-semibold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>

          <Link href="/feed" className="w-full">
            <Button
              variant="outline"
              className="w-full h-11 text-sm font-semibold border-white/10 text-white hover:bg-white/5 flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              <span>Back to Feed</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
