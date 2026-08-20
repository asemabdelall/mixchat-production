"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Film,
  Hash,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Music2,
  Play,
  Replace,
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
import { reelsService, type ReelItemDto } from "@/services/reels/reelsService";
import { mapService } from "@/services/map/MapService";

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReelCreated?: (reel: ReelItemDto) => void;
}

const MAX_REEL_SIZE = 100 * 1024 * 1024;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const CreateReelModal: React.FC<CreateReelModalProps> = ({
  isOpen,
  onClose,
  onReelCreated,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [audioTitle, setAudioTitle] = useState("Original Audio");
  const [locationTag, setLocationTag] = useState("");
  const [visibility, setVisibility] = useState<ContentAudience>("PUBLIC");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
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
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetForm = () => {
    clearFile();
    setCaption("");
    setAudioTitle("Original Audio");
    setLocationTag("");
    setVisibility("PUBLIC");
    setUploadProgress(0);
    setError(null);
    setLocationError(null);
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
      Boolean(file) ||
      Boolean(caption.trim()) ||
      audioTitle !== "Original Audio" ||
      Boolean(locationTag.trim()) ||
      visibility !== "PUBLIC";
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
    if (!selected.type.startsWith("video/")) {
      setError("Choose an MP4, WebM, or MOV video for your reel.");
      return;
    }
    if (selected.size > MAX_REEL_SIZE) {
      setError("This video is larger than the 100 MB upload limit.");
      return;
    }

    releasePreview();
    const nextPreviewUrl = URL.createObjectURL(selected);
    previewUrlRef.current = nextPreviewUrl;
    setFile(selected);
    setPreviewUrl(nextPreviewUrl);
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

  const detectLocation = () => {
    if (!navigator.geolocation || isDetectingLocation) {
      if (!navigator.geolocation) {
        setLocationError("Location is not supported by this browser.");
      }
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void mapService
          .reverseGeocode({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            language: navigator.language,
          })
          .then((place) => setLocationTag(place.label))
          .catch(() =>
            setLocationError(
              "We found your location but could not identify the place name.",
            ),
          )
          .finally(() => setIsDetectingLocation(false));
      },
      (locationRequestError) => {
        setIsDetectingLocation(false);
        setLocationError(
          locationRequestError.code === locationRequestError.PERMISSION_DENIED
            ? "Allow location access in your browser, then try again."
            : "Your current location is unavailable. You can enter it manually.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Add a video before publishing your reel.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const mediaObject = await mediaService.uploadFile({
        file,
        kind: "VIDEO",
        onProgress: setUploadProgress,
      });

      const createdReel = await reelsService.createReel({
        mediaObjectId: mediaObject.id,
        caption: caption.trim() || undefined,
        audioTitle: audioTitle.trim() || undefined,
        locationTag: locationTag.trim() || undefined,
        visibility,
      });

      onReelCreated?.(createdReel);
      resetForm();
      onClose();
      router.push(`/reels?id=${createdReel.id}`);
    } catch (requestError: unknown) {
      setError(
        (requestError as { message?: string })?.message ||
          "Your reel could not be published. Please try again.",
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
      title="Create reel"
      maxWidth="full"
      mobilePresentation="fullscreen"
      closeDisabled={isUploading}
      className="sm:max-w-5xl sm:p-0"
      contentClassName="overflow-hidden p-0 pr-0"
    >
      <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-1 custom-scrollbar sm:px-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-extrabold text-white">New short video</p>
              <p className="mt-1 text-sm leading-5 text-white/50">
                Preview your reel, add context, then choose who can watch it.
              </p>
            </div>
            <span className="hidden shrink-0 rounded-full bg-purple-500/12 px-3 py-1.5 text-xs font-bold text-purple-200 sm:inline-flex">
              9:16 recommended
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

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,0.82fr)_minmax(380px,1.18fr)] lg:gap-8">
            <section aria-label="Reel video" className="lg:sticky lg:top-0">
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
                  className={`group flex h-[min(56dvh,600px)] min-h-96 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-b from-white/[0.075] to-white/[0.025] p-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                    isDragging ? "bg-purple-500/14" : "hover:bg-white/[0.085]"
                  }`}
                >
                  <span className="relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-purple-500/14 text-purple-200 transition-transform duration-300 group-hover:-translate-y-1">
                    <Film className="h-9 w-9" aria-hidden="true" />
                    <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-950/50">
                      <Upload className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="mt-6 text-lg font-extrabold text-white">
                    {isDragging ? "Drop your video here" : "Choose a reel video"}
                  </span>
                  <span className="mt-2 max-w-xs text-sm leading-6 text-white/50">
                    Tap to browse or drag and drop an MP4, WebM, or MOV file up to 100 MB.
                  </span>
                  <span className="mt-5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/65">
                    Vertical HD video works best
                  </span>
                </button>
              ) : (
                <div className="relative mx-auto aspect-[9/16] max-h-[62dvh] overflow-hidden rounded-[2rem] bg-black shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-contain"
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent p-4 pb-10">
                    <Avatar
                      src={user?.avatarUrl}
                      alt={displayName}
                      size="sm"
                    />
                    <span className="truncate text-sm font-bold text-white">{displayName}</span>
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={clearFile}
                      aria-label="Remove selected reel video"
                      className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {file && (
                <div className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl bg-white/[0.04] px-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/12 text-purple-300">
                    <Play className="h-4.5 w-4.5 fill-purple-300" aria-hidden="true" />
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

            <section aria-label="Reel details" className="space-y-6">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="reel-caption" className="text-sm font-bold text-white">
                    Caption
                  </label>
                  <span className="text-xs tabular-nums text-white/40">{caption.length}/2200</span>
                </div>
                <textarea
                  id="reel-caption"
                  dir="auto"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Tell people what this reel is about…"
                  maxLength={2200}
                  rows={5}
                  disabled={isUploading}
                  className="mt-2 min-h-32 w-full resize-none rounded-2xl bg-white/[0.055] p-4 text-base leading-6 text-white outline-none transition-colors placeholder:text-white/35 hover:bg-white/[0.075] focus:bg-white/[0.085] focus:ring-2 focus:ring-purple-400/65 disabled:opacity-45"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCaption((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}#`)}
                    disabled={isUploading}
                    className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-white/[0.045] px-3 text-sm font-semibold text-white/55 hover:bg-white/[0.075] hover:text-white disabled:opacity-45"
                  >
                    <Hash className="h-4 w-4" aria-hidden="true" />
                    Hashtag
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reel-audio" className="text-sm font-bold text-white">
                    Audio title
                  </label>
                  <div className="relative mt-2">
                    <Music2 className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-cyan-300" aria-hidden="true" />
                    <input
                      id="reel-audio"
                      value={audioTitle}
                      onChange={(event) => setAudioTitle(event.target.value)}
                      placeholder="Original Audio"
                      disabled={isUploading}
                      className="h-12 w-full rounded-2xl bg-white/[0.055] pl-11 pr-4 text-base text-white outline-none transition-colors placeholder:text-white/35 hover:bg-white/[0.075] focus:bg-white/[0.085] focus:ring-2 focus:ring-purple-400/65 disabled:opacity-45"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="reel-location" className="text-sm font-bold text-white">
                      Location
                    </label>
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={isUploading || isDetectingLocation}
                      className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-purple-300 hover:bg-purple-500/10 disabled:cursor-wait disabled:opacity-50"
                    >
                      {isDetectingLocation ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <LocateFixed className="h-4 w-4" aria-hidden="true" />
                      )}
                      Use current
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-pink-300" aria-hidden="true" />
                    <input
                      id="reel-location"
                      value={locationTag}
                      onChange={(event) => {
                        setLocationTag(event.target.value);
                        setLocationError(null);
                      }}
                      placeholder="Add a place"
                      disabled={isUploading}
                      className="h-12 w-full rounded-2xl bg-white/[0.055] pl-11 pr-4 text-base text-white outline-none transition-colors placeholder:text-white/35 hover:bg-white/[0.075] focus:bg-white/[0.085] focus:ring-2 focus:ring-purple-400/65 disabled:opacity-45"
                    />
                  </div>
                  {locationError && (
                    <p role="alert" className="mt-2 text-xs leading-5 text-rose-300">
                      {locationError}
                    </p>
                  )}
                </div>
              </div>

              <AudienceSelector
                value={visibility}
                onChange={setVisibility}
                disabled={isUploading}
                description="Control who can discover and watch this reel."
              />
            </section>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onClick={(event) => {
              event.currentTarget.value = "";
            }}
            onChange={handleFileSelect}
            aria-label="Choose reel video"
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
                    <span className="truncate">Uploading and preparing your reel…</span>
                  </span>
                  <span className="tabular-nums text-purple-200">{uploadProgress}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Reel upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadProgress}
                  className="h-1.5 overflow-hidden rounded-full bg-white/8"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-[width] duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/45">
                {file ? "Your video is ready to publish." : "Add a video to enable publishing."}
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
              className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(124,58,237,0.25)] transition-[filter,opacity] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-44 sm:flex-none"
            >
              {isUploading ? (
                <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Film className="h-5 w-5" aria-hidden="true" />
              )}
              {isUploading ? "Publishing…" : "Publish reel"}
            </button>
          </div>
        </footer>

        <DiscardCreationPrompt
          isOpen={isConfirmingClose}
          itemName="reel"
          onKeepEditing={() => setIsConfirmingClose(false)}
          onDiscard={discardAndClose}
        />
      </form>
    </Modal>
  );
};
