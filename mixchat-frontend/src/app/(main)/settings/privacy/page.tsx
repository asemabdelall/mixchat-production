"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  Check,
  UserX,
  Star,
  Loader2,
  Save,
} from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { useAuth } from "@/shared/providers/AuthProvider";
import { userService } from "@/services/user/userService";
import { Switch } from "@/shared/components/ui/Switch";

type ContactVisibility = "Everyone" | "My Contacts" | "Nobody";
type LocationMode = "exact" | "approx" | "ghost";
type MentionVisibility = "Everyone" | "Following" | "Nobody";

export default function PrivacySettingsPage() {
  const { user: authUser, updateProfile } = useAuth();

  const [isPrivate, setIsPrivate] = useState(authUser?.isPrivate || false);
  const [lastSeen, setLastSeen] = useState<ContactVisibility>("Everyone");
  const [profilePhoto, setProfilePhoto] =
    useState<ContactVisibility>("Everyone");
  const [locationMode, setLocationMode] = useState<LocationMode>("exact");
  const [readReceipts, setReadReceipts] = useState(true);
  const [allowMentions, setAllowMentions] =
    useState<MentionVisibility>("Everyone");
  const [allowDirectMessages, setAllowDirectMessages] =
    useState<MentionVisibility>("Everyone");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [profile, settings] = await Promise.all([
          userService.getOwnProfile(),
          userService.getPrivacySettings(),
        ]);
        setIsPrivate(profile.isPrivate);
        if (settings.lastSeen)
          setLastSeen(settings.lastSeen as ContactVisibility);
        if (settings.profilePhoto)
          setProfilePhoto(settings.profilePhoto as ContactVisibility);
        if (settings.locationMode)
          setLocationMode(settings.locationMode as LocationMode);
        setReadReceipts(settings.readReceipts);
        if (settings.allowMentions)
          setAllowMentions(settings.allowMentions as MentionVisibility);
        if (settings.allowDirectMessages)
          setAllowDirectMessages(
            settings.allowDirectMessages as MentionVisibility,
          );
      } catch (loadError: unknown) {
        setError(
          (loadError as { message?: string }).message ||
            "Could not load privacy settings.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const [updatedProfile] = await Promise.all([
        userService.updateOwnProfile({ isPrivate }),
        userService.updatePrivacySettings({
          lastSeen,
          profilePhoto,
          locationMode,
          readReceipts,
          allowMentions,
          allowDirectMessages,
        }),
      ]);

      updateProfile(updatedProfile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (saveError: unknown) {
      setError(
        (saveError as { message?: string }).message ||
          "Could not save privacy settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Settings</span>
        </Link>
        <h1 className="text-xl font-bold text-white">Privacy & Safety</h1>
        <div className="w-16" />
      </div>

      <Card className="glass-panel p-6 border-white/10 space-y-6">
        {/* Account Privacy (Private / Public) */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-purple-400" />
              <div>
                <h4 className="font-semibold text-sm text-white">
                  Private Account
                </h4>
                <p className="text-xs text-muted-foreground">
                  Only approved followers can see your posts, stories, and
                  details.
                </p>
              </div>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              label="Private account"
            />
          </div>
        </div>

        {/* Last Seen */}
        <div className="pt-2 border-t border-white/10">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
            Last Seen & Online Status
          </label>
          <div className="flex gap-2">
            {(["Everyone", "My Contacts", "Nobody"] as ContactVisibility[]).map(
              (opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLastSeen(opt)}
                  aria-pressed={lastSeen === opt}
                  className={`flex-1 min-h-11 py-2 rounded-xl text-xs font-bold transition-all ${
                    lastSeen === opt
                      ? "gradient-bg-primary text-white shadow-md"
                      : "glass-card text-muted-foreground"
                  }`}
                >
                  {opt}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Profile Photo */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
            Profile Photo Visibility
          </label>
          <div className="flex gap-2">
            {(["Everyone", "My Contacts", "Nobody"] as ContactVisibility[]).map(
              (opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setProfilePhoto(opt)}
                  aria-pressed={profilePhoto === opt}
                  className={`flex-1 min-h-11 py-2 rounded-xl text-xs font-bold transition-all ${
                    profilePhoto === opt
                      ? "gradient-bg-primary text-white shadow-md"
                      : "glass-card text-muted-foreground"
                  }`}
                >
                  {opt}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Location Privacy Mode */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1">
            Map Location Sharing Mode
          </label>
          <p className="text-[11px] text-muted-foreground mb-3">
            Control how precisely your position appears to friends on the Live
            Map.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: "exact" as LocationMode,
                label: "Exact",
                desc: "Precise street level",
              },
              {
                id: "approx" as LocationMode,
                label: "Approximate",
                desc: "~1 km blur radius",
              },
              {
                id: "ghost" as LocationMode,
                label: "Ghost Mode",
                desc: "Hidden completely",
              },
            ].map((mode) => {
              const isSelected = locationMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setLocationMode(mode.id)}
                  aria-pressed={isSelected}
                  className={`min-h-16 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "gradient-bg-primary text-white border-purple-500/50 shadow-md"
                      : "glass-card text-muted-foreground border-white/10 hover:text-white"
                  }`}
                >
                  <span className="font-bold text-xs block">{mode.label}</span>
                  <span className="text-[9px] opacity-80 block mt-0.5">
                    {mode.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Read Receipts */}
        <div className="space-y-4 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm text-white">
                Read Receipts
              </h4>
              <p className="text-xs text-muted-foreground">
                Show checkmarks when you read messages
              </p>
            </div>
            <input
              aria-label="Read receipts"
              type="checkbox"
              checked={readReceipts}
              onChange={(e) => setReadReceipts(e.target.checked)}
              className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Safety & Social Graph Controls */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
            Safety & Social Graph Controls
          </label>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/settings/close-friends"
              className="p-3 rounded-2xl glass-card border border-white/10 hover:border-emerald-500/30 flex flex-col items-start gap-1.5 transition-colors"
            >
              <Star className="h-4 w-4 text-emerald-400 fill-emerald-400" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Close Friends
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Private audience
                </span>
              </div>
            </Link>

            <Link
              href="/settings/muted"
              className="p-3 rounded-2xl glass-card border border-white/10 hover:border-indigo-500/30 flex flex-col items-start gap-1.5 transition-colors"
            >
              <UserX className="h-4 w-4 text-indigo-400" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Muted Users
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Feed suppression
                </span>
              </div>
            </Link>

            <Link
              href="/settings/blocked"
              className="p-3 rounded-2xl glass-card border border-white/10 hover:border-rose-500/30 flex flex-col items-start gap-1.5 transition-colors"
            >
              <UserX className="h-4 w-4 text-rose-400" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Blocked
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Full boundary
                </span>
              </div>
            </Link>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-12 text-base font-bold shadow-xl shadow-purple-500/30 gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : saved ? (
            <Check className="h-5 w-5" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          <span>
            {saved ? "Privacy Settings Saved!" : "Save Privacy Settings"}
          </span>
        </Button>
        {error && (
          <p role="alert" className="text-center text-xs text-rose-300">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
