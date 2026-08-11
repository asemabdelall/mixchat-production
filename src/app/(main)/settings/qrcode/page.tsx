"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { CURRENT_USER } from "@/shared/services/mockData";

export default function QRCodePage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://mixchat.app/u/${CURRENT_USER.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12 text-center">
      <div className="flex items-center justify-between">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
        <h1 className="text-xl font-bold text-white">My QR Code</h1>
        <div className="w-16" />
      </div>

      <Card className="glass-panel p-8 border-white/10 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glowing Orbs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 gradient-bg-primary rounded-full blur-3xl opacity-30 pointer-events-none" />

        <div className="flex items-center justify-center gap-2.5 mx-auto relative z-10">
          <Image
            src="/mixchat-icon.png"
            alt="Mix Chat Logo"
            width={36}
            height={44}
            className="h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]"
          />
          <span className="font-black text-base tracking-widest text-white">
            MIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">CHAT</span>
          </span>
        </div>

        <div className="p-4 bg-white rounded-3xl inline-block shadow-2xl relative z-10">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://mixchat.app/u/${CURRENT_USER.username}`}
            alt="QR Code"
            className="w-48 h-48"
          />
        </div>

        <div className="space-y-1 relative z-10">
          <h3 className="text-lg font-bold text-white">{CURRENT_USER.displayName}</h3>
          <p className="text-xs text-purple-300 font-medium">@{CURRENT_USER.username}</p>
        </div>

        <div className="space-y-3 pt-2 relative z-10">
          <Button onClick={handleCopy} size="lg" className="w-full h-12 gap-2 font-bold shadow-xl shadow-purple-500/30">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Link Copied!" : "Copy Profile Link"}</span>
          </Button>

          <Button variant="glass" size="lg" className="w-full h-12 gap-2 text-purple-300">
            <Share2 className="h-4 w-4" />
            <span>Share Profile Card</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
