"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { useAuth } from "@/shared/providers/AuthProvider";

export default function QRCodePage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const username = user?.username || "user";
  const displayName = user?.displayName || user?.username || "MixChat User";
  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/profile/${username}`
      : `/profile/${username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} on MixChat`,
          text: `Connect with ${displayName} (@${username}) on MixChat!`,
          url: profileUrl,
        });
      } catch {
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12 text-center select-none">
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Settings</span>
        </Link>
        <h1 className="text-xl font-bold text-white">Share Profile</h1>
        <div className="w-16" />
      </div>

      <Card className="glass-panel p-8 border-white/10 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glowing Orbs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 gradient-bg-primary rounded-full blur-3xl opacity-30 pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <h3 className="text-lg font-bold text-white">{displayName}</h3>
          <p className="text-xs text-purple-300 font-medium">@{username}</p>
        </div>

        <div className="space-y-3 pt-2 relative z-10">
          <Button
            onClick={() => void handleCopy()}
            size="lg"
            className="w-full h-12 gap-2 font-bold shadow-xl shadow-purple-500/30"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>{copied ? "Link Copied!" : "Copy Profile Link"}</span>
          </Button>

          <Button
            onClick={handleShare}
            variant="glass"
            size="lg"
            className="w-full h-12 gap-2 text-purple-300"
          >
            <Share2 className="h-4 w-4" />
            <span>Share Profile Card</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
