"use client";

import React, { useEffect, useState, useRef } from "react";
import { Sparkles, UploadCloud, X, Loader2 } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useAuth } from "@/shared/providers/AuthProvider";
import { mediaService } from "@/services/media/mediaService";
import {
  storiesService,
  StoryItemDto,
  StoryAudience,
} from "@/services/stories/storiesService";

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: (story: StoryItemDto) => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<StoryAudience>("PUBLIC");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate size (max 50MB for video, 10MB for image)
    const isVid = selected.type.startsWith("video/");
    const maxBytes = isVid ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (selected.size > maxBytes) {
      setError(`File size exceeds limit (${isVid ? "50MB" : "10MB"})`);
      return;
    }

    setError(null);
    setFile(selected);
    setIsVideo(isVid);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleClearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setIsVideo(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a photo or video to post a story");
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      // 1. Upload file to Cloudflare R2 via Phase 3 Media Architecture
      const mediaObject = await mediaService.uploadFile({
        file,
        kind: isVideo ? "VIDEO" : "IMAGE",
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      });

      // 2. Create 24h Story referencing READY MediaObject ID
      const newStory = await storiesService.createStory({
        mediaObjectId: mediaObject.id,
        caption: caption.trim() || undefined,
        audience,
      });

      onStoryCreated(newStory);
      handleClearFile();
      setCaption("");
      onClose();
    } catch (err: unknown) {
      console.error("Failed to create story", err);
      const msg =
        (err as { message?: string })?.message ||
        "Failed to publish story. Please try again.";
      setError(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const displayName = user?.displayName || user?.username || "You";
  const avatarUrl = user?.avatarUrl || "";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create 24h Story">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header User info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={avatarUrl} alt={displayName} size="sm" />
            <div>
              <h4 className="font-bold text-xs text-white">{displayName}</h4>
              <span className="text-[11px] text-purple-300">
                Your Story (24h)
              </span>
            </div>
          </div>

          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as StoryAudience)}
            aria-label="Story audience"
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-purple-300 focus:outline-none cursor-pointer"
          >
            <option value="PUBLIC" className="bg-[#111625] text-white">
              🌐 Public
            </option>
            <option value="FOLLOWERS" className="bg-[#111625] text-white">
              👥 Followers Only
            </option>
            <option value="CLOSE_FRIENDS" className="bg-[#111625] text-white">
              ⭐️ Close Friends
            </option>
          </select>
        </div>

        {/* Media Upload Area / Canvas Preview */}
        {!previewUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Choose a photo or video for your story"
            className="w-full h-64 rounded-2xl border-2 border-dashed border-white/15 hover:border-purple-500/50 bg-white/[0.02] flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all group"
          >
            <div className="p-3.5 rounded-full bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform mb-2">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="font-bold text-xs text-white">
              Choose a photo or video
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Supports JPEG, PNG, WEBP & MP4 (Up to 50MB)
            </p>
          </button>
        ) : (
          <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center shadow-2xl">
            {isVideo ? (
              <video
                src={previewUrl}
                controls
                className="w-full h-full object-contain"
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Story Preview"
                className="w-full h-full object-contain"
              />
            )}

            <button
              type="button"
              onClick={handleClearFile}
              aria-label="Remove selected story media"
              className="absolute top-3 right-3 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer z-10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Caption Input */}
        <input
          type="text"
          placeholder="Add a caption to your story... (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={500}
          aria-label="Story caption"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
        />

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-purple-300 font-semibold">
              <span>Uploading media to Cloudflare R2...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                style={{ width: `${uploadProgress}%` }}
                className="h-full gradient-bg-primary transition-all duration-150"
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div role="alert" className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end pt-2 border-t border-white/10">
          <Button
            type="submit"
            isLoading={isUploading}
            disabled={!file || isUploading}
            size="sm"
            className="gradient-bg-primary font-bold text-xs"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Publishing Story...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Share 24h Story</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
