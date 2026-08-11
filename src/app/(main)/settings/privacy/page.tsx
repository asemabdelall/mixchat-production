"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Check } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

export default function PrivacySettingsPage() {
  const [lastSeen, setLastSeen] = useState("Everyone");
  const [profilePhoto, setProfilePhoto] = useState("My Contacts");
  const [readReceipts, setReadReceipts] = useState(true);
  const [ghostMode, setGhostMode] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Settings</span>
        </Link>
        <h1 className="text-xl font-bold text-white">Privacy & Security</h1>
        <div className="w-16" />
      </div>

      <Card className="glass-panel p-6 border-white/10 space-y-6">
        {/* Last Seen */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
            Last Seen & Online Status
          </label>
          <div className="flex gap-2">
            {["Everyone", "My Contacts", "Nobody"].map((opt) => (
              <button
                key={opt}
                onClick={() => setLastSeen(opt)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  lastSeen === opt ? "gradient-bg-primary text-white shadow-md" : "glass-card text-muted-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Photo */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
            Profile Photo Privacy
          </label>
          <div className="flex gap-2">
            {["Everyone", "My Contacts", "Nobody"].map((opt) => (
              <button
                key={opt}
                onClick={() => setProfilePhoto(opt)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  profilePhoto === opt ? "gradient-bg-primary text-white shadow-md" : "glass-card text-muted-foreground"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Location Privacy Mode */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1">
            Map Location Sharing Mode
          </label>
          <p className="text-[11px] text-muted-foreground mb-3">
            Control how precisely your position appears to friends on the Live Map.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "exact", label: "Exact", desc: "Precise street level" },
              { id: "approx", label: "Approximate", desc: "~1 km radius blur" },
              { id: "ghost", label: "Ghost Mode", desc: "Hidden completely" },
            ].map((mode) => {
              const isSelected = (mode.id === "ghost" && ghostMode) || (mode.id === "exact" && !ghostMode);
              return (
                <button
                  key={mode.id}
                  onClick={() => setGhostMode(mode.id === "ghost")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "gradient-bg-primary text-white border-purple-500/50 shadow-md"
                      : "glass-card text-muted-foreground border-white/10 hover:text-white"
                  }`}
                >
                  <span className="font-bold text-xs block">{mode.label}</span>
                  <span className="text-[9px] opacity-80 block mt-0.5">{mode.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm text-white">Read Receipts</h4>
              <p className="text-xs text-muted-foreground">Show checkmarks when you read messages</p>
            </div>
            <input
              type="checkbox"
              checked={readReceipts}
              onChange={(e) => setReadReceipts(e.target.checked)}
              className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm text-white flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-blue-400" />
                <span>Two-Factor Authentication</span>
              </h4>
              <p className="text-xs text-muted-foreground">Protect your Mix Chat account with 2FA OTP</p>
            </div>
            <input
              type="checkbox"
              checked={twoFactor}
              onChange={(e) => setTwoFactor(e.target.checked)}
              className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full h-12 text-base font-bold shadow-xl shadow-purple-500/30">
          {saved ? <Check className="h-5 w-5" /> : null}
          <span>{saved ? "Privacy Settings Saved!" : "Save Privacy Settings"}</span>
        </Button>
      </Card>
    </div>
  );
}
