"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, MapPin, Check, Palette } from "lucide-react";
import { CURRENT_USER } from "@/shared/services/mockData";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { ProfileThemeOption } from "../types/profileTypes";

const COVER_PRESETS = [
  { id: "c1", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80", label: "Neon Violet" },
  { id: "c2", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80", label: "Gradient Cyber" },
  { id: "c3", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80", label: "Midnight Dark" },
];

const THEME_OPTIONS: { id: ProfileThemeOption; label: string; color: string }[] = [
  { id: "violet", label: "Mix Violet", color: "from-purple-500 to-indigo-600" },
  { id: "cyan", label: "Cyber Cyan", color: "from-cyan-500 to-blue-600" },
  { id: "amber", label: "Sunset Amber", color: "from-orange-500 to-amber-600" },
  { id: "emerald", label: "Emerald Green", color: "from-emerald-500 to-teal-600" },
];

export const EditProfileForm: React.FC = () => {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(CURRENT_USER.displayName);
  const [username, setUsername] = useState(CURRENT_USER.username);
  const [bio, setBio] = useState(CURRENT_USER.bio || "");
  const [locationCity, setLocationCity] = useState(CURRENT_USER.location?.city || "San Francisco, CA");
  const [selectedCover, setSelectedCover] = useState(CURRENT_USER.coverImage || COVER_PRESETS[0].url);
  const [selectedTheme, setSelectedTheme] = useState<ProfileThemeOption>("violet");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      router.push("/profile");
    }, 1200);
  };

  return (
    <form onSubmit={handleSave} className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between glass-panel p-4 rounded-3xl border border-white/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="p-2 rounded-2xl glass-card text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">Edit Social Profile</h2>
            <p className="text-xs text-muted-foreground">Customize your profile identity & theme</p>
          </div>
        </div>

        <Button type="submit" size="sm" className="gradient-bg-primary font-bold gap-1.5 shadow-md">
          {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{isSaved ? "Saved!" : "Save Changes"}</span>
        </Button>
      </div>

      {/* Cover Preset Picker */}
      <Card className="glass-panel p-6 border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Cover Image Banner</span>
        </h3>

        <div className="h-36 w-full rounded-2xl overflow-hidden relative border border-white/10 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedCover} alt="Cover Preview" className="w-full h-full object-cover" />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          {COVER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedCover(preset.url)}
              className={`rounded-xl overflow-hidden border-2 transition-all cursor-pointer aspect-video relative ${
                selectedCover === preset.url ? "border-purple-500 scale-105 shadow-md" : "border-white/10 opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </Card>

      {/* Profile Details Inputs */}
      <Card className="glass-panel p-6 border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white mb-2">Profile Identity</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Display Name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-10 text-xs" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} className="h-10 text-xs" />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <label className="font-semibold text-muted-foreground">Bio Description</label>
            <span className="text-[10px] text-purple-300">{bio.length} / 160</span>
          </div>
          <textarea
            maxLength={160}
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">City Location</label>
          <Input
            icon={<MapPin className="h-4 w-4" />}
            value={locationCity}
            onChange={(e) => setLocationCity(e.target.value)}
            className="h-10 text-xs"
          />
        </div>
      </Card>

      {/* Theme Accent Picker */}
      <Card className="glass-panel p-6 border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Palette className="h-4 w-4 text-purple-400" />
          <span>Profile Accent Theme</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex items-center justify-between ${
                  isSelected
                    ? "glass-panel border-purple-500 shadow-md shadow-purple-500/20"
                    : "glass-card border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full bg-gradient-to-r ${theme.color}`} />
                  <span className="text-xs font-bold text-white">{theme.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-purple-400" />}
              </button>
            );
          })}
        </div>
      </Card>
    </form>
  );
};
