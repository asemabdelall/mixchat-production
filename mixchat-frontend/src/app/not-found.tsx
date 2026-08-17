"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

export default function NotFound() {
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

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
          <Compass className="h-3.5 w-3.5" />
          <span>404 • Page Not Found</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Lost in the Matrix
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The post, user profile, or screen you&apos;re looking for might have
            been moved, deleted, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link href="/feed" className="w-full">
            <Button className="w-full h-11 text-sm font-semibold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2">
              <Home className="h-4 w-4" />
              <span>Back to Feed</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full h-11 text-sm font-semibold border-white/10 text-white hover:bg-white/5 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
