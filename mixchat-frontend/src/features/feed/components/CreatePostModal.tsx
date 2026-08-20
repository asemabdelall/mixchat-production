"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  MapPin,
  Sparkles,
  X,
  Video,
  Globe,
  Users,
  Star,
  Smile,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  Palette,
  AtSign,
  Hash,
  Plus,
  LocateFixed,
} from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useAuth } from "@/shared/providers/AuthProvider";
import { mediaService, MediaObjectDto } from "@/services/media/mediaService";
import { postsService, mapDtoToPost } from "@/services/feed/postsService";
import { offlineStorage } from "@/services/storage/offlineStorage";
import { Post } from "@/types";
import {
  getPostBackgroundTheme,
  POST_BACKGROUND_THEMES,
  type PostBackgroundThemeId,
} from "../postBackgroundThemes";
import { mapService } from "@/services/map/MapService";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
  initialContent?: string;
}

interface SelectedMediaItem {
  id?: string;
  file?: File;
  previewUrl: string;
  mediaObjectId?: string;
  isUploading: boolean;
  progress: number;
  kind: "IMAGE" | "VIDEO";
  error?: string;
}

const FEELINGS_LIST = [
  { label: "happy", emoji: "😊" },
  { label: "excited", emoji: "🔥" },
  { label: "blessed", emoji: "🙏" },
  { label: "creative", emoji: "🎨" },
  { label: "traveling", emoji: "✈️" },
  { label: "listening to music", emoji: "🎧" },
  { label: "working", emoji: "💻" },
  { label: "chilling", emoji: "☕" },
  { label: "celebrating", emoji: "🎉" },
  { label: "inspired", emoji: "💡" },
];

const POPULAR_LOCATIONS = [
  "Dubai, UAE",
  "Riyadh, Saudi Arabia",
  "Cairo, Egypt",
  "San Francisco, CA",
  "New York, NY",
  "London, UK",
  "Tokyo, Japan",
  "Paris, France",
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  initialContent,
}) => {
  const { user } = useAuth();

  // Content & Audience State
  const [content, setContent] = useState(() => {
    if (typeof window === "undefined" || !user?.id) return initialContent || "";
    return offlineStorage.getPostDraft(user.id)?.content || initialContent || "";
  });

  const [audience, setAudience] = useState<"PUBLIC" | "FOLLOWERS" | "CLOSE_FRIENDS">(() => {
    if (typeof window === "undefined" || !user?.id) return "PUBLIC";
    const saved = offlineStorage.getPostDraft(user.id)?.visibility;
    if (saved && ["PUBLIC", "FOLLOWERS", "CLOSE_FRIENDS"].includes(saved)) {
      return saved as "PUBLIC" | "FOLLOWERS" | "CLOSE_FRIENDS";
    }
    return "PUBLIC";
  });

  // Media & Metadata State
  const [mediaItems, setMediaItems] = useState<SelectedMediaItem[]>([]);
  const [locationTag, setLocationTag] = useState<string>(() => {
    if (typeof window === "undefined" || !user?.id) return "";
    return offlineStorage.getPostDraft(user.id)?.locationTag || "";
  });
  const [selectedFeeling, setSelectedFeeling] = useState<{ label: string; emoji: string } | null>(null);
  const [selectedBgTheme, setSelectedBgTheme] = useState<
    PostBackgroundThemeId | "none"
  >(() => {
    if (typeof window === "undefined" || !user?.id) return "none";
    const saved = offlineStorage.getPostDraft(user.id)?.backgroundTheme;
    return POST_BACKGROUND_THEMES.some((theme) => theme.id === saved)
      ? (saved as PostBackgroundThemeId)
      : "none";
  });

  // UI Interactive Drawers
  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<"none" | "feeling" | "location" | "themes">("none");
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audienceDropdownRef = useRef<HTMLDivElement>(null);
  const mediaItemsRef = useRef<SelectedMediaItem[]>([]);

  useEffect(() => {
    mediaItemsRef.current = mediaItems;
  }, [mediaItems]);

  // Clean up object URLs on unmount
  useEffect(
    () => () => {
      mediaItemsRef.current.forEach((item) => {
        if (item.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    },
    [],
  );

  // Close audience dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (audienceDropdownRef.current && !audienceDropdownRef.current.contains(e.target as Node)) {
        setIsAudienceDropdownOpen(false);
      }
    };
    if (isAudienceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAudienceDropdownOpen]);

  // Persist draft on content/audience change
  useEffect(() => {
    if (!user?.id) return;
    if (content.trim()) {
      offlineStorage.savePostDraft(user.id, {
        content,
        visibility: audience,
        locationTag: locationTag || undefined,
        backgroundTheme:
          selectedBgTheme === "none" ? undefined : selectedBgTheme,
        updatedAt: Date.now(),
      });
    }
  }, [content, audience, locationTag, selectedBgTheme, user]);

  // Handle media file upload pipeline
  const handleFilesSelected = async (
    files: FileList | null,
    kind: "IMAGE" | "VIDEO" = "IMAGE",
  ) => {
    if (!files || files.length === 0) return;
    setSelectedBgTheme("none"); // Reset colored text if media is added

    const newItems: SelectedMediaItem[] = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isUploading: true,
      progress: 0,
      kind,
    }));

    setMediaItems((prev) => [...prev, ...newItems]);
    setErrorMessage(null);

    for (const item of newItems) {
      if (!item.file) continue;

      try {
        const uploaded: MediaObjectDto = await mediaService.uploadFile({
          file: item.file,
          kind,
          onProgress: (percent) => {
            setMediaItems((current) =>
              current.map((m) =>
                m.previewUrl === item.previewUrl ? { ...m, progress: percent } : m,
              ),
            );
          },
        });

        setMediaItems((current) =>
          current.map((m) => {
            if (m.previewUrl !== item.previewUrl) return m;
            if (uploaded.publicUrl && m.previewUrl.startsWith("blob:")) {
              URL.revokeObjectURL(m.previewUrl);
            }
            return {
              ...m,
              mediaObjectId: uploaded.id,
              previewUrl: uploaded.publicUrl || m.previewUrl,
              isUploading: false,
              progress: 100,
            };
          }),
        );
      } catch (err: unknown) {
        const message = (err as { message?: string })?.message || "Upload failed";
        setMediaItems((current) =>
          current.map((m) =>
            m.previewUrl === item.previewUrl
              ? { ...m, isUploading: false, error: message }
              : m,
          ),
        );
        setErrorMessage(message);
      }
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaItems((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const isVideo = e.dataTransfer.files[0].type.startsWith("video/");
      void handleFilesSelected(e.dataTransfer.files, isVideo ? "VIDEO" : "IMAGE");
    }
  };

  const handleAddMention = () => {
    setContent((prev) => prev + (prev.endsWith(" ") || prev === "" ? "@" : " @"));
    textareaRef.current?.focus();
  };

  const handleAddHashtag = () => {
    setContent((prev) => prev + (prev.endsWith(" ") || prev === "" ? "#" : " #"));
    textareaRef.current?.focus();
  };

  const handleUseCurrentLocation = () => {
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
          .then((place) => {
            setLocationTag(place.label);
            setNearbyLocations(place.alternatives);
            setCustomLocationInput("");
          })
          .catch(() => {
            setLocationError(
              "We found your coordinates but could not name this place. You can enter it manually.",
            );
          })
          .finally(() => setIsDetectingLocation(false));
      },
      (error) => {
        setIsDetectingLocation(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Allow location access in your browser settings, then try again."
            : "Your location is unavailable right now. Please try again.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const handleLocationDrawerToggle = () => {
    if (activeDrawer === "location") {
      setActiveDrawer("none");
      return;
    }
    setActiveDrawer("location");
    if (!locationTag) handleUseCurrentLocation();
  };

  const isAnyMediaUploading = mediaItems.some((m) => m.isUploading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isAnyMediaUploading) return;

    let finalContent = content.trim();
    if (selectedFeeling && !finalContent.includes(selectedFeeling.emoji)) {
      // Append feeling activity seamlessly if present
      finalContent = `${finalContent} — feeling ${selectedFeeling.label} ${selectedFeeling.emoji}`.trim();
    }

    const readyMediaIds = mediaItems
      .map((m) => m.mediaObjectId)
      .filter((id): id is string => Boolean(id));

    if (!finalContent && readyMediaIds.length === 0) {
      setErrorMessage("Please write some text or attach photos/videos to post.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createdDto = await postsService.createPost({
        content: finalContent,
        mediaObjectIds: readyMediaIds.length > 0 ? readyMediaIds : undefined,
        visibility: audience,
        locationTag: locationTag || undefined,
        backgroundTheme:
          selectedBgTheme === "none" ? undefined : selectedBgTheme,
      });

      const uiPost = mapDtoToPost(createdDto);
      onPostCreated(uiPost);

      // Clear draft
      if (user?.id) {
        offlineStorage.clearPostDraft(user.id);
      }

      // Reset state
      setContent("");
      setSelectedFeeling(null);
      setSelectedBgTheme("none");
      setLocationTag("");
      mediaItems.forEach((item) => {
        if (item.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      setMediaItems([]);
      setIsSubmitting(false);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to publish post";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const currentTheme = getPostBackgroundTheme(selectedBgTheme);
  const isColoredMode = selectedBgTheme !== "none" && mediaItems.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Post"
      maxWidth="lg"
      mobilePresentation="fullscreen"
      contentClassName="overflow-hidden p-0 pr-0"
    >
      <form
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex h-full min-h-0 flex-col"
      >
        {/* Scrollable Container */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar sm:p-5">
          {/* User Profile Bar & Custom Audience Selector */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={user?.avatarUrl}
                alt={user?.displayName || "User"}
                size="md"
                isVerified={user?.isVerified}
                className="shrink-0"
              />

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm text-white truncate">
                    {user?.displayName || user?.username || "You"}
                  </span>
                  {selectedFeeling && (
                    <span className="text-xs text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      <span>is feeling {selectedFeeling.label}</span>
                      <span>{selectedFeeling.emoji}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFeeling(null)}
                        className="hover:text-white ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>

                {/* Custom Audience Popover Dropdown */}
                <div className="relative inline-block mt-1" ref={audienceDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsAudienceDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all shadow-xs"
                  >
                    {audience === "PUBLIC" ? (
                      <Globe className="h-3.5 w-3.5 text-blue-400" />
                    ) : audience === "FOLLOWERS" ? (
                      <Users className="h-3.5 w-3.5 text-purple-400" />
                    ) : (
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    )}

                    <span>
                      {audience === "PUBLIC"
                        ? "Public"
                        : audience === "FOLLOWERS"
                          ? "Followers"
                          : "Close Friends"}
                    </span>

                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                  </button>

                  <AnimatePresence>
                    {isAudienceDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-1.5 w-60 rounded-2xl bg-[#14192b] border border-white/15 p-1.5 shadow-2xl z-50 backdrop-blur-xl"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setAudience("PUBLIC");
                            setIsAudienceDropdownOpen(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors ${audience === "PUBLIC" ? "bg-purple-600/20 text-white" : "hover:bg-white/5 text-white/70"
                            }`}
                        >
                          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
                            <Globe className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">Public</span>
                              {audience === "PUBLIC" && <Check className="h-3.5 w-3.5 text-purple-400" />}
                            </div>
                            <p className="text-[11px] text-white/50 leading-tight mt-0.5">Anyone on or off MixChat</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAudience("FOLLOWERS");
                            setIsAudienceDropdownOpen(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors ${audience === "FOLLOWERS" ? "bg-purple-600/20 text-white" : "hover:bg-white/5 text-white/70"
                            }`}
                        >
                          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 mt-0.5">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">Followers Only</span>
                              {audience === "FOLLOWERS" && <Check className="h-3.5 w-3.5 text-purple-400" />}
                            </div>
                            <p className="text-[11px] text-white/50 leading-tight mt-0.5">Only people who follow you</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAudience("CLOSE_FRIENDS");
                            setIsAudienceDropdownOpen(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors ${audience === "CLOSE_FRIENDS" ? "bg-purple-600/20 text-white" : "hover:bg-white/5 text-white/70"
                            }`}
                        >
                          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                            <Star className="h-4 w-4 fill-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">Close Friends</span>
                              {audience === "CLOSE_FRIENDS" && <Check className="h-3.5 w-3.5 text-purple-400" />}
                            </div>
                            <p className="text-[11px] text-white/50 leading-tight mt-0.5">Only your selected VIP friends</p>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Location Pill Tag (if set) */}
            {locationTag && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium">
                <MapPin className="h-3 w-3 text-blue-400" />
                <span className="max-w-[120px] truncate">{locationTag}</span>
                <button
                  type="button"
                  onClick={() => setLocationTag("")}
                  className="hover:text-white p-0.5 ml-0.5"
                  title="Remove location"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Text Area (Standard vs Styled Facebook Card) */}
          <div
            className={`relative rounded-2xl transition-all duration-200 ${isColoredMode
              ? `p-6 min-h-[200px] flex items-center justify-center text-center shadow-lg ${currentTheme?.className ?? ""}`
                : "bg-transparent"
              }`}
          >
            <textarea
              ref={textareaRef}
              rows={isColoredMode ? 4 : mediaItems.length > 0 ? 3 : 5}
              maxLength={2000}
              placeholder={
                isColoredMode
                  ? "Write something memorable..."
                  : `What's on your mind, ${user?.displayName?.split(" ")[0] || "friend"}?`
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 resize-none transition-all canvas-textarea ${isColoredMode
                  ? "text-center text-xl sm:text-2xl font-black placeholder:text-white/60 text-white"
                  : "text-base sm:text-lg text-white placeholder:text-white/35 font-normal leading-relaxed"
                }`}
              style={{ outline: "none", border: "none", boxShadow: "none" }}
              autoFocus
              data-modal-autofocus
            />

            {/* Exit colored mode button */}
            {isColoredMode && (
              <button
                type="button"
                onClick={() => setSelectedBgTheme("none")}
                className="absolute right-2.5 top-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                title="Remove colored background"
                aria-label="Remove colored background"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Facebook-style Color Themes Swatch (When text-only) */}
          {mediaItems.length === 0 && activeDrawer === "themes" && (
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-white/5 border border-white/10 overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold text-white/60 px-2">Theme:</span>
              <button
                type="button"
                onClick={() => setSelectedBgTheme("none")}
                aria-label="Use default post background"
                aria-pressed={selectedBgTheme === "none"}
                className={`h-11 w-11 shrink-0 rounded-xl border bg-white/10 transition-transform active:scale-95 ${
                  selectedBgTheme === "none"
                    ? "border-purple-300 ring-2 ring-purple-400"
                    : "border-white/20"
                }`}
              />
              {POST_BACKGROUND_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedBgTheme(theme.id)}
                  aria-label={`Use ${theme.label} post background`}
                  aria-pressed={selectedBgTheme === theme.id}
                  className={`h-11 w-11 rounded-xl shrink-0 transition-transform active:scale-95 border ${theme.className} border-white/30 ${selectedBgTheme === theme.id ? "ring-2 ring-purple-400 scale-105" : "hover:scale-105"}`}
                  title={theme.label}
                />
              ))}
            </div>
          )}

          {/* Media Multi-Image Grid / Upload Preview */}
          {mediaItems.length > 0 && (
            <div className="space-y-2">
              <div
                className={`grid gap-2 rounded-2xl overflow-hidden ${mediaItems.length === 1
                    ? "grid-cols-1"
                    : mediaItems.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-2 sm:grid-cols-3"
                  }`}
              >
                {mediaItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`relative group rounded-xl overflow-hidden border border-white/10 bg-black/50 shadow-md ${mediaItems.length === 1 ? "h-64 sm:h-72" : "h-36 sm:h-44"
                      }`}
                  >
                    {item.kind === "VIDEO" ? (
                      <video
                        src={item.previewUrl}
                        className="w-full h-full object-cover"
                        controls={false}
                        muted
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt="Upload Preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}

                    {item.kind === "VIDEO" && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-cyan-300 flex items-center gap-1 border border-cyan-500/30">
                        <Video className="h-3 w-3" />
                        <span>VIDEO</span>
                      </div>
                    )}

                    {/* Upload progress overlay */}
                    {item.isUploading && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-3">
                        <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
                        <span className="text-xs font-extrabold text-white font-mono">
                          {item.progress}%
                        </span>
                      </div>
                    )}

                    {item.error && (
                      <div className="absolute inset-0 bg-rose-950/90 flex items-center justify-center p-3 text-center text-xs text-rose-200 font-semibold">
                        {item.error}
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="absolute top-2 right-2 rounded-full bg-black/80 hover:bg-rose-600 p-1.5 text-white transition-all shadow-lg active:scale-90"
                      title="Remove item"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add More Media Tile */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-36 sm:h-44 rounded-xl border-2 border-dashed border-white/20 hover:border-purple-500/60 bg-white/5 hover:bg-purple-500/10 flex flex-col items-center justify-center gap-2 text-white/60 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <div className="p-3 rounded-full bg-white/10 text-white">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold">Add Photos/Videos</span>
                </button>
              </div>
            </div>
          )}

          {/* Drag & Drop Visual Hint */}
          {isDragOver && (
            <div className="p-8 border-2 border-dashed border-purple-400 rounded-2xl bg-purple-500/20 text-center space-y-2 animate-pulse">
              <ImageIcon className="h-10 w-10 text-purple-300 mx-auto" />
              <p className="text-sm font-bold text-white">Drop photos or videos here</p>
            </div>
          )}

          {/* Inline Feelings Drawer */}
          {activeDrawer === "feeling" && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/70">How are you feeling?</span>
                <button
                  type="button"
                  onClick={() => setActiveDrawer("none")}
                  className="text-white/50 hover:text-white text-xs"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {FEELINGS_LIST.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => {
                      setSelectedFeeling(f);
                      setActiveDrawer("none");
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all ${selectedFeeling?.label === f.label
                        ? "bg-purple-600 text-white font-bold"
                        : "bg-white/5 hover:bg-white/10 text-white/80"
                      }`}
                  >
                    <span className="text-base">{f.emoji}</span>
                    <span className="capitalize truncate">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inline Location Search Drawer */}
          {activeDrawer === "location" && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/70">Add Location</span>
                <button
                  type="button"
                  onClick={() => setActiveDrawer("none")}
                  className="text-white/50 hover:text-white text-xs"
                >
                  Close
                </button>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isDetectingLocation}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-400/25 bg-blue-500/12 px-4 text-sm font-bold text-blue-200 transition-colors hover:bg-blue-500/20 disabled:cursor-wait disabled:opacity-60"
              >
                {isDetectingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LocateFixed className="h-4 w-4" aria-hidden="true" />
                )}
                <span>
                  {isDetectingLocation
                    ? "Finding nearby place…"
                    : "Use my current location"}
                </span>
              </button>

              {locationError && (
                <p role="alert" className="text-xs leading-relaxed text-rose-300">
                  {locationError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <MapPin className="h-4 w-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Where are you? (e.g. Dubai, Tokyo, Coffee Shop)"
                    value={customLocationInput}
                    onChange={(e) => setCustomLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customLocationInput.trim()) {
                        e.preventDefault();
                        setLocationTag(customLocationInput.trim());
                        setCustomLocationInput("");
                        setActiveDrawer("none");
                      }
                    }}
                    aria-label="Search or enter a place"
                    className="min-h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] py-2 pl-9 pr-3 text-base text-white transition-all placeholder:text-white/35 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-xs"
                  />
                </div>
                {customLocationInput.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocationTag(customLocationInput.trim());
                      setCustomLocationInput("");
                      setActiveDrawer("none");
                    }}
                    className="min-h-11 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-500"
                  >
                    Set
                  </button>
                )}
              </div>

              {/* Location Suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="mr-1 text-[11px] text-white/40">
                  {nearbyLocations.length > 0 ? "Nearby:" : "Popular:"}
                </span>
                {(nearbyLocations.length > 0
                  ? nearbyLocations
                  : POPULAR_LOCATIONS
                ).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setLocationTag(loc);
                      setActiveDrawer("none");
                    }}
                    className="min-h-11 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs text-white/70 transition-colors hover:bg-blue-500/20 hover:text-blue-300"
                  >
                    {loc}
                  </button>
                ))}
              </div>
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center text-[11px] text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
              >
                Location data © OpenStreetMap contributors
              </a>
            </div>
          )}
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files, "IMAGE")}
        />
        <input
          type="file"
          ref={videoInputRef}
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files, "VIDEO")}
        />

        {/* Bottom "Add to your post" Action Bar & Submit */}
        <div className="shrink-0 space-y-3 border-t border-white/10 bg-[#090d1a]/92 p-3 pb-[max(0.75rem,var(--sab))] backdrop-blur-xl sm:p-4">
          {/* Facebook/Instagram "Add to your post" Toolbar Container */}
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-inner sm:justify-between sm:p-2.5">
            <span className="hidden pl-1 text-xs font-bold text-white/80 sm:block">Add to your post</span>

            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar sm:flex-none sm:gap-1.5">
              {/* Photo Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add photos"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-95"
                title="Photo / Images"
              >
                <ImageIcon className="h-5 w-5" />
              </button>

              {/* Video Button */}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                aria-label="Add video"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-cyan-400 transition-all hover:bg-cyan-500/20 active:scale-95"
                title="Video"
              >
                <Video className="h-5 w-5" />
              </button>

              {/* Tag / Mention Button */}
              <button
                type="button"
                onClick={handleAddMention}
                aria-label="Mention someone"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-blue-400 transition-all hover:bg-blue-500/20 active:scale-95"
                title="Tag People (@)"
              >
                <AtSign className="h-5 w-5" />
              </button>

              {/* Hashtag Button */}
              <button
                type="button"
                onClick={handleAddHashtag}
                aria-label="Add hashtag"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-pink-400 transition-all hover:bg-pink-500/20 active:scale-95"
                title="Add Hashtag (#)"
              >
                <Hash className="h-5 w-5" />
              </button>

              {/* Feeling Button */}
              <button
                type="button"
                onClick={() =>
                  setActiveDrawer((prev) => (prev === "feeling" ? "none" : "feeling"))
                }
                aria-label="Add feeling or activity"
                aria-pressed={activeDrawer === "feeling"}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${activeDrawer === "feeling" || selectedFeeling
                    ? "bg-amber-500/20 text-amber-300"
                    : "text-amber-400 hover:bg-amber-500/20"
                  }`}
                title="Feeling / Activity"
              >
                <Smile className="h-5 w-5" />
              </button>

              {/* Location Button */}
              <button
                type="button"
                onClick={handleLocationDrawerToggle}
                aria-label="Add current location"
                aria-pressed={activeDrawer === "location"}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${activeDrawer === "location" || locationTag
                    ? "bg-blue-500/20 text-blue-300"
                    : "text-rose-400 hover:bg-rose-500/20"
                  }`}
                title="Check in / Location"
              >
                <MapPin className="h-5 w-5" />
              </button>

              {/* Background Color Mode Button (Only when no media) */}
              {mediaItems.length === 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveDrawer((prev) => (prev === "themes" ? "none" : "themes"))
                  }
                  aria-label="Choose text background"
                  aria-pressed={activeDrawer === "themes"}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${activeDrawer === "themes" || isColoredMode
                      ? "bg-purple-500/20 text-purple-300"
                      : "text-purple-400 hover:bg-purple-500/20"
                    }`}
                  title="Text Background Color"
                >
                  <Palette className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Submit Post Button with Draft Indicator */}
          <div className="space-y-1.5">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isAnyMediaUploading ||
                (!content.trim() && mediaItems.length === 0)
              }
              className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black tracking-wide text-white shadow-xl shadow-purple-900/40 transition-all gradient-bg-primary hover:opacity-95 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Publishing to MixChat...</span>
                </>
              ) : isAnyMediaUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
                  <span>Uploading Media ({mediaItems.filter((m) => !m.isUploading).length}/{mediaItems.length})...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Post</span>
                </>
              )}
            </button>

            {/* Subtle Draft Autosave Status & Char Counter */}
            <div className="flex items-center justify-between text-[11px] text-white/40 px-2 font-mono">
              <div className="flex items-center gap-1.5">
                {content.trim().length > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Draft saved</span>
                  </span>
                )}
              </div>
              <span>{content.length}/2000</span>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
