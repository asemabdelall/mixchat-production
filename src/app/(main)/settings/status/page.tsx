"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Save, Smile } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";

const statusPresets = [
  { emoji: "💼", text: "At work", category: "Work" },
  { emoji: "🏋️‍♂️", text: "At the gym", category: "Fitness" },
  { emoji: "✈️", text: "Traveling", category: "Travel" },
  { emoji: "😴", text: "Sleeping", category: "Rest" },
  { emoji: "🎧", text: "Listening to music", category: "Entertainment" },
  { emoji: "🎮", text: "Gaming", category: "Entertainment" },
  { emoji: "☕", text: "Coffee break", category: "Social" },
];

export default function SetStatusPage() {
  const [currentStatus, setCurrentStatus] = useState("Working on Mix Chat UI 🎨");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
        <h1 className="text-xl font-bold text-white">42 Status</h1>
        <div className="w-16" />
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="glass-panel p-6 border-white/10 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
              What&apos;s on your mind?
            </label>
            <Input
              icon={<Smile className="h-4 w-4" />}
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              placeholder="Set custom status..."
              className="h-11 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-3">
              Preset Statuses
            </label>

            <div className="space-y-2">
              {statusPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStatus(`${preset.emoji} ${preset.text}`)}
                  className="w-full glass-card p-3 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-colors flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="text-xs font-bold text-white">{preset.text}</span>
                  </div>
                  <span className="text-[10px] text-purple-300 font-semibold">{preset.category}</span>
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-base font-bold shadow-xl shadow-purple-500/30 mt-4">
            {saved ? <Check className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            <span>{saved ? "Status Updated!" : "Save Status"}</span>
          </Button>
        </Card>
      </form>
    </div>
  );
}
