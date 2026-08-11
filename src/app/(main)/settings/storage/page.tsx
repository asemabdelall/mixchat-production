"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, HardDrive, Trash2, Check, Download, Wifi } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

export default function StorageSettingsPage() {
  const [dataSaver, setDataSaver] = useState(false);
  const [autoPhotos, setAutoPhotos] = useState(true);
  const [autoVideos, setAutoVideos] = useState(true);
  const [autoAudio, setAutoAudio] = useState(true);
  const [cacheSize, setCacheSize] = useState("1.2 GB");
  const [cleared, setCleared] = useState(false);

  const handleClearCache = () => {
    setCacheSize("0 MB");
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
        <h1 className="text-xl font-bold text-white">Data & Storage</h1>
        <div className="w-16" />
      </div>

      <Card className="glass-panel p-6 border-white/10 space-y-6">
        {/* Data Saver */}
        <div className="flex items-center justify-between p-4 glass-card rounded-2xl border border-white/10">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Wifi className="h-4 w-4 text-purple-400" />
              <span>Data Saver</span>
            </h4>
            <p className="text-xs text-muted-foreground">Reduce mobile data usage during video calls and feeds</p>
          </div>
          <input
            type="checkbox"
            checked={dataSaver}
            onChange={(e) => setDataSaver(e.target.checked)}
            className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
          />
        </div>

        {/* Auto Download Toggles */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Download className="h-4 w-4 text-blue-400" />
            <span>Auto-Download Media</span>
          </h4>

          <div className="space-y-2">
            {[
              { label: "Photos", state: autoPhotos, set: setAutoPhotos },
              { label: "Videos", state: autoVideos, set: setAutoVideos },
              { label: "Audio & Voice Notes", state: autoAudio, set: setAutoAudio },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 glass-card rounded-2xl">
                <span className="font-semibold text-xs text-white">{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.state}
                  onChange={(e) => item.set(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Storage Clear Cache */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
              <HardDrive className="h-4 w-4 text-pink-400" />
              <span>Cache Storage</span>
            </h4>
            <p className="text-xs text-muted-foreground">Currently using <strong className="text-purple-300">{cacheSize}</strong></p>
          </div>

          <Button
            onClick={handleClearCache}
            variant="glass"
            size="sm"
            className="text-rose-400 gap-1.5 font-bold"
          >
            {cleared ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            <span>{cleared ? "Cache Cleared!" : "Clear Cache (1.2 GB)"}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
