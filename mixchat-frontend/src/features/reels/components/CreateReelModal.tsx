"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  UploadCloud,
  X,
  Loader2,
  Music,
  MapPin,
  Film,
  Globe,
  Users,
} from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Textarea } from "@/shared/components/ui/Textarea";
import { mediaService } from "@/services/media/mediaService";
import { reelsService, type ReelItemDto } from "@/services/reels/reelsService";

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReelCreated?: (reel: ReelItemDto) => void;
}

export const CreateReelModal: React.FC<CreateReelModalProps> = ({
  isOpen,
  onClose,
  onReelCreated,
}) => {
  const router = useRouter();

  const [caption, setCaption] = useState("");
  const [audioTitle, setAudioTitle] = useState("Original Audio");
  const [locationTag, setLocationTag] = useState("");
  const [visibility, setVisibility] = useState<
    "PUBLIC" | "FOLLOWERS" | "CLOSE_FRIENDS"
  >("PUBLIC");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("video/")) {
      setError("Please select a valid video file (MP4, WebM, MOV)");
      return;
    }

    // 100MB limit for high-definition video
    if (selected.size > 100 * 1024 * 1024) {
      setError("Video file size exceeds limit (100MB max)");
      return;
    }

    setError(null);
    setFile(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleClearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file for your reel");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Upload video directly to Cloudflare R2
      const mediaObject = await mediaService.uploadFile({
        file,
        kind: "VIDEO",
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      });

      // 2. Create Reel referencing READY mediaObject
      const createdReel = await reelsService.createReel({
        mediaObjectId: mediaObject.id,
        caption: caption.trim() || undefined,
        audioTitle: audioTitle.trim() || undefined,
        locationTag: locationTag.trim() || undefined,
        visibility,
      });

      if (onReelCreated) {
        onReelCreated(createdReel);
      }

      handleClearFile();
      setCaption("");
      setLocationTag("");
      onClose();
      router.push(`/reels?id=${createdReel.id}`);
    } catch (err: unknown) {
      console.error("Failed to create reel", err);
      const msg =
        (err as { message?: string })?.message ||
        "Failed to publish video reel. Please try again.";
      setError(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Short Reel 🎬"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1 select-none">
        {error && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* Video Upload Drop Area / Preview */}
        {!previewUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Choose a video for your reel"
            className="border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.05] group"
          >
            <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all mb-3">
              <UploadCloud className="h-8 w-8" />
            </div>
            <p className="text-xs font-bold text-white text-center">
              Click or Drag & Drop Video
            </p>
            <p className="text-[11px] text-muted-foreground text-center mt-1">
              Supports MP4, WebM, MOV up to 100MB
            </p>
          </button>
        ) : (
          <div className="relative aspect-[9/16] max-h-[340px] mx-auto rounded-2xl overflow-hidden glass-card border border-purple-500/30 bg-black">
            <video
              src={previewUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
            {!isUploading && (
              <button
                type="button"
                onClick={handleClearFile}
                aria-label="Remove selected reel video"
                className="absolute top-2 right-2 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Caption */}
        <Textarea
          label="Reel Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption with hashtags (e.g. #vibes #mixchat)..."
          maxLength={2200}
          rows={3}
          disabled={isUploading}
          aria-label="Reel caption"
          charCount={caption.length}
          maxCharCount={2200}
        />

        {/* Soundtrack & Location Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Audio Soundtrack"
            icon={<Music className="h-3.5 w-3.5 text-cyan-400" />}
            value={audioTitle}
            onChange={(e) => setAudioTitle(e.target.value)}
            placeholder="Original Audio Track"
            disabled={isUploading}
            aria-label="Audio soundtrack title"
          />

          <Input
            label="Location Tag"
            icon={<MapPin className="h-3.5 w-3.5 text-pink-400" />}
            value={locationTag}
            onChange={(e) => setLocationTag(e.target.value)}
            placeholder="e.g. Venice Beach, CA"
            disabled={isUploading}
            aria-label="Reel location"
          />
        </div>

        {/* Audience Scope Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white">
            Audience Visibility
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setVisibility("PUBLIC")}
              disabled={isUploading}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                visibility === "PUBLIC"
                  ? "bg-purple-500/20 border-purple-500 text-white font-bold"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
              }`}
            >
              <Globe className="h-4 w-4" />
              <span className="text-[10px]">Public</span>
            </button>

            <button
              type="button"
              onClick={() => setVisibility("FOLLOWERS")}
              disabled={isUploading}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                visibility === "FOLLOWERS"
                  ? "bg-purple-500/20 border-purple-500 text-white font-bold"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="text-[10px]">Followers</span>
            </button>

            <button
              type="button"
              onClick={() => setVisibility("CLOSE_FRIENDS")}
              disabled={isUploading}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                visibility === "CLOSE_FRIENDS"
                  ? "bg-green-500/20 border-green-500 text-white font-bold"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
              }`}
            >
              <Sparkles className="h-4 w-4 text-green-400" />
              <span className="text-[10px]">Close Friends</span>
            </button>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-purple-300">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading video to Cloudflare R2...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full gradient-bg-primary transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isUploading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!file || isUploading}
            className="gradient-bg-primary text-white text-xs font-bold shadow-lg shadow-purple-500/25 px-5 rounded-2xl"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing Reel...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                Publish Reel
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
