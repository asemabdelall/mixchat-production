"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Clock3,
  ImagePlus,
  LoaderCircle,
  Play,
  Replace,
  Send,
  Upload,
  X,
} from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Avatar } from "@/shared/components/ui/Avatar";
import {
  AudienceSelector,
  type ContentAudience,
} from "@/shared/components/content/AudienceSelector";
import { DiscardCreationPrompt } from "@/shared/components/content/DiscardCreationPrompt";
import { useAuth } from "@/shared/providers/AuthProvider";
import { mediaService } from "@/services/media/mediaService";
import {
  storiesService,
  type StoryItemDto,
} from "@/services/stories/storiesService";

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: (story: StoryItemDto) => void;
}

const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<ContentAudience>("PUBLIC");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const releasePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const clearFile = () => {
    releasePreview();
    setFile(null);
    setPreviewUrl(null);
    setIsVideo(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    clearFile();
    setCaption("");
    setAudience("PUBLIC");
    setUploadProgress(0);
    setError(null);
    setIsDragging(false);
    setIsConfirmingClose(false);
  };

  const requestClose = () => {
    if (isUploading) return;
    if (isConfirmingClose) {
      setIsConfirmingClose(false);
      return;
    }
    const hasDraft =
      Boolean(file) || Boolean(caption.trim()) || audience !== "PUBLIC";
    if (hasDraft) {
      setIsConfirmingClose(true);
      return;
    }
    onClose();
  };

  const discardAndClose = () => {
    resetForm();
    onClose();
  };

  const selectFile = (selected: File | undefined) => {
    if (!selected) return;
    const nextIsVideo = selected.type.startsWith("video/");
    const isImage = selected.type.startsWith("image/");

    if (!nextIsVideo && !isImage) {
      setError("Choose a supported photo or video for your story.");
      return;
    }

    const sizeLimit = nextIsVideo ? VIDEO_LIMIT : IMAGE_LIMIT;
    if (selected.size > sizeLimit) {
      setError(
        `${nextIsVideo ? "Videos" : "Photos"} can be up to ${nextIsVideo ? "50 MB" : "10 MB"}.`,
      );
      return;
    }

    releasePreview();
    const nextPreviewUrl = URL.createObjectURL(selected);
    previewUrlRef.current = nextPreviewUrl;
    setFile(selected);
    setPreviewUrl(nextPreviewUrl);
    setIsVideo(nextIsVideo);
    setError(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Add a photo or video before sharing your story.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const mediaObject = await mediaService.uploadFile({
        file,
        kind: isVideo ? "VIDEO" : "IMAGE",
        onProgress: setUploadProgress,
      });

      const newStory = await storiesService.createStory({
        mediaObjectId: mediaObject.id,
        caption: caption.trim() || undefined,
        audience,
      });

      onStoryCreated(newStory);
      resetForm();
      onClose();
    } catch (requestError: unknown) {
      setError(
        (requestError as { message?: string })?.message ||
          "Your story could not be published. Please try again.",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const displayName = user?.displayName || user?.username || "You";

  return (
    <Modal
      isOpen={isOpen}
      onClose={requestClose}
      title="Create story"
      maxWidth="full"
      mobilePresentation="fullscreen"
      closeDisabled={isUploading}
      className="sm:max-w-4xl sm:p-0"
      contentClassName="overflow-hidden p-0 pr-0"
    >
      <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-1 custom-scrollbar sm:px-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-extrabold text-white">Share a moment</p>
              <p className="mt-1 text-sm leading-5 text-white/50">
                Add one photo or video. Your story disappears after 24 hours.
              </p>
            </div>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-purple-500/12 px-3 py-1.5 text-xs font-bold text-purple-200 sm:flex">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              24 hours
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-2xl bg-rose-500/10 p-4 text-sm leading-5 text-rose-100"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid items-start gap-6 md:grid-cols-[minmax(270px,0.9fr)_minmax(320px,1.1fr)] md:gap-8">
            <section aria-label="Story media" className="md:sticky md:top-0">
              {!previewUrl ? (
                <button
                  type="button"
                  data-modal-autofocus
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`group flex h-[min(56dvh,560px)] min-h-96 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-b from-white/[0.075] to-white/[0.025] p-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                    isDragging ? "bg-purple-500/14" : "hover:bg-white/[0.085]"
                  }`}
                >
                  <span className="relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-pink-500/12 text-pink-200 transition-transform duration-300 group-hover:-translate-y-1">
                    <ImagePlus className="h-9 w-9" aria-hidden="true" />
                    <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-purple-950/50">
                      <Upload className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="mt-6 text-lg font-extrabold text-white">
                    {isDragging ? "Drop your moment here" : "Choose photo or video"}
                  </span>
                  <span className="mt-2 max-w-xs text-sm leading-6 text-white/50">
                    Use JPEG, PNG, WebP, MP4, WebM, or MOV. Vertical media looks best.
                  </span>
                  <span className="mt-5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/65">
                    Photos 10 MB · Videos 50 MB
                  </span>
                </button>
              ) : (
                <div className="relative mx-auto aspect-[9/16] max-h-[62dvh] overflow-hidden rounded-[2rem] bg-black shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Your story preview"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2.5 p-4">
                    <Avatar
                      src={user?.avatarUrl}
                      alt={displayName}
                      size="sm"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-white">{displayName}</span>
                      <span className="block text-xs text-white/60">Now</span>
                    </span>
                  </div>
                  {caption && (
                    <p
                      dir="auto"
                      className="pointer-events-none absolute inset-x-5 bottom-8 line-clamp-4 text-center text-base font-bold leading-6 text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.85)]"
                    >
                      {caption}
                    </p>
                  )}
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={clearFile}
                      aria-label="Remove selected story media"
                      className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {file && (
                <div className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl bg-white/[0.04] px-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/12 text-pink-300">
                    {isVideo ? (
                      <Play className="h-4.5 w-4.5 fill-pink-300" aria-hidden="true" />
                    ) : (
                      <ImagePlus className="h-4.5 w-4.5" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white/85">{file.name}</span>
                    <span className="block text-xs text-white/40">{formatFileSize(file.size)}</span>
                  </span>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-purple-300 hover:bg-purple-500/10"
                    >
                      <Replace className="h-4 w-4" aria-hidden="true" />
                      Replace
                    </button>
                  )}
                </div>
              )}
            </section>

            <section aria-label="Story details" className="space-y-6">
              <div className="rounded-2xl bg-white/[0.04] p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={user?.avatarUrl}
                    alt={displayName}
                    size="md"
                    isVerified={user?.isVerified}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{displayName}</p>
                    <p className="mt-0.5 text-xs text-white/45">Posting to your story</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/12 text-purple-300">
                    <Clock3 className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="story-caption" className="text-sm font-bold text-white">
                    Caption
                  </label>
                  <span className="text-xs tabular-nums text-white/40">{caption.length}/500</span>
                </div>
                <textarea
                  id="story-caption"
                  dir="auto"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Add a caption to your story…"
                  maxLength={500}
                  rows={4}
                  disabled={isUploading}
                  className="mt-2 min-h-28 w-full resize-none rounded-2xl bg-white/[0.055] p-4 text-base leading-6 text-white outline-none transition-colors placeholder:text-white/35 hover:bg-white/[0.075] focus:bg-white/[0.085] focus:ring-2 focus:ring-purple-400/65 disabled:opacity-45"
                />
                <p className="mt-2 text-xs leading-5 text-white/40">
                  Your caption appears over the story preview and supports Arabic or English.
                </p>
              </div>

              <AudienceSelector
                value={audience}
                onChange={setAudience}
                disabled={isUploading}
                description="Choose exactly who can open this story for the next 24 hours."
              />
            </section>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            onClick={(event) => {
              event.currentTarget.value = "";
            }}
            onChange={handleFileSelect}
            aria-label="Choose story photo or video"
            className="sr-only"
          />
        </div>

        <footer className="shrink-0 bg-[#0d1220]/96 px-4 pb-[calc(1rem+var(--sab))] pt-3 backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:gap-5 sm:px-6 sm:pb-5">
          <div className="mb-3 min-w-0 flex-1 sm:mb-0">
            {isUploading ? (
              <div aria-live="polite">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-white/65">
                  <span className="flex min-w-0 items-center gap-2">
                    <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-purple-300" aria-hidden="true" />
                    <span className="truncate">Uploading and preparing your story…</span>
                  </span>
                  <span className="tabular-nums text-purple-200">{uploadProgress}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Story upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadProgress}
                  className="h-1.5 overflow-hidden rounded-full bg-white/8"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 transition-[width] duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-white/45">
                <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {file ? "Ready to share for 24 hours." : "Add media to enable sharing."}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={isUploading}
              className="hidden min-h-12 cursor-pointer rounded-2xl px-5 text-sm font-bold text-white/55 hover:bg-white/[0.055] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:block"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isUploading}
              className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 px-6 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(124,58,237,0.25)] transition-[filter,opacity] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-44 sm:flex-none"
            >
              {isUploading ? (
                <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-5 w-5" aria-hidden="true" />
              )}
              {isUploading ? "Sharing…" : "Share story"}
            </button>
          </div>
        </footer>

        <DiscardCreationPrompt
          isOpen={isConfirmingClose}
          itemName="story"
          onKeepEditing={() => setIsConfirmingClose(false)}
          onDiscard={discardAndClose}
        />
      </form>
    </Modal>
  );
};
