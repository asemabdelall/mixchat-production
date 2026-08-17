"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  MapPin,
  Check,
  AlertCircle,
  Loader2,
  Globe,
  Lock,
} from "lucide-react";
import { useAuth } from "@/shared/providers/AuthProvider";
import { userService } from "@/services/user/userService";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Textarea } from "@/shared/components/ui/Textarea";
import { Card } from "@/shared/components/ui/Card";
import { MediaPicker } from "@/features/media/components/MediaPicker";
import { Switch } from "@/shared/components/ui/Switch";

export const EditProfileForm: React.FC = () => {
  const router = useRouter();
  const { user: authUser, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(
    authUser?.displayName || authUser?.username || "",
  );
  const [username, setUsername] = useState(authUser?.username || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [website, setWebsite] = useState(authUser?.website || "");
  const [locationCity, setLocationCity] = useState(
    authUser?.locationCity || "",
  );
  const [avatarUrl, setAvatarUrl] = useState(authUser?.avatarUrl || "");
  const [selectedCover, setSelectedCover] = useState(
    authUser?.coverUrl || "",
  );
  const [isPrivate, setIsPrivate] = useState(authUser?.isPrivate || false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await userService.getOwnProfile();
        setDisplayName(data.displayName || data.username);
        setUsername(data.username);
        setBio(data.bio || "");
        setWebsite(data.website || "");
        setLocationCity(data.locationCity || "");
        setAvatarUrl(data.avatarUrl || "");
        setSelectedCover(data.coverUrl || "");
        setIsPrivate(data.isPrivate);
      } catch {
        setErrorMessage("Your profile could not be loaded. Please try again.");
      }
    };
    void loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const updated = await userService.updateOwnProfile({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        website: website.trim(),
        locationCity: locationCity.trim(),
        avatarUrl: avatarUrl ? avatarUrl.trim() : undefined,
        coverUrl: selectedCover || undefined,
        isPrivate,
      });

      updateProfile(updated);
      setIsSaved(true);

      setTimeout(() => {
        setIsSaved(false);
        router.push("/profile");
      }, 1000);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setErrorMessage(
        apiErr?.message || "Failed to update profile. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
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
            className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl glass-card text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">
              Edit Social Profile
            </h2>
            <p className="text-xs text-muted-foreground">
              Update your identity, media, and privacy
            </p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          size="sm"
          className="gradient-bg-primary font-bold gap-1.5 shadow-md"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSaved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{isSaved ? "Saved!" : "Save Changes"}</span>
        </Button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Real R2 cover picker */}
      <Card className="glass-panel p-6 border-white/10 space-y-4">
        <MediaPicker
          label="Profile Cover Image"
          helperText="Upload an image directly to Cloudflare R2"
          currentPreviewUrl={selectedCover || null}
          onMediaUploaded={(media) => {
            if (media.publicUrl) setSelectedCover(media.publicUrl);
          }}
        />
      </Card>

      {/* Profile Details Inputs */}
      <Card className="glass-panel p-6 border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white mb-2">Profile Identity</h3>

        {/* Real R2 Cloud Avatar Picker */}
        <div className="pb-2 border-b border-white/10">
          <MediaPicker
            label="Profile Avatar Photo"
            helperText="Upload an image directly to Cloudflare R2"
            currentPreviewUrl={avatarUrl || null}
            onMediaUploaded={(media) => {
              if (media.publicUrl) {
                setAvatarUrl(media.publicUrl);
              }
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your full name"
            required
          />

          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            required
          />
        </div>

        <Textarea
          label="Bio Description"
          maxLength={160}
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell the community a little about yourself..."
          charCount={bio.length}
          maxCharCount={160}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="City Location"
            icon={<MapPin className="h-4 w-4" />}
            value={locationCity}
            placeholder="e.g. Cairo, Egypt"
            onChange={(e) => setLocationCity(e.target.value)}
          />

          <Input
            label="Website / Link"
            icon={<Globe className="h-4 w-4" />}
            value={website}
            placeholder="https://yourwebsite.com"
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {/* Account Privacy Toggle */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-purple-400" />
            <div>
              <p className="text-xs font-bold text-white">Private Account</p>
              <p className="text-[11px] text-muted-foreground">
                When private, new followers must send a request.
              </p>
            </div>
          </div>
          <Switch
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
            label="Private account"
          />
        </div>
      </Card>
    </form>
  );
};
