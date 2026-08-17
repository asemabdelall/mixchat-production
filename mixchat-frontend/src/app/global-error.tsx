"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MixChat GlobalError]", error);
  }, [error]);

  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex items-center justify-center p-4 bg-[#090c15] text-white font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#0f1424]/80 border border-white/10 text-center space-y-6 shadow-2xl backdrop-blur-xl">
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
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Critical Application Error</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              System Glitch
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A critical error occurred while loading the application core.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => reset()}
              className="w-full h-11 text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload Application</span>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
