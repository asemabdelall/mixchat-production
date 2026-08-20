"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Eye,
  Send,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Trash2,
  BadgeCheck,
  Lock,
  Star,
  Loader2,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useAuth } from "@/shared/providers/AuthProvider";
import {
  storiesService,
  StoryGroupDto,
  StoryItemDto,
  StoryReactionType,
} from "@/services/stories/storiesService";
import { StoryViewersSheet } from "./StoryViewersSheet";

interface StoryViewerModalProps {
  storyGroups: StoryGroupDto[];
  initialGroupIndex?: number;
  initialStoryIndex?: number;
  onClose: () => void;
  onStoryDeleted?: (storyId: string) => void;
}

const quickEmojis: {
  label: string;
  value: StoryReactionType;
  emoji: string;
}[] = [
  { label: "Heart", value: "HEART", emoji: "❤️" },
  { label: "Fire", value: "FIRE", emoji: "🔥" },
  { label: "Laugh", value: "LAUGH", emoji: "😂" },
  { label: "Surprised", value: "SURPRISED", emoji: "😮" },
  { label: "Sad", value: "SAD", emoji: "😢" },
  { label: "Clap", value: "CLAP", emoji: "👏" },
];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  storyGroups,
  initialGroupIndex = 0,
  initialStoryIndex = 0,
  onClose,
  onStoryDeleted,
}) => {
  const { user } = useAuth();

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);

  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  const [showViewers, setShowViewers] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewedStoriesSet = useRef<Set<string>>(new Set());

  const currentGroup = storyGroups[groupIndex];
  const currentStory: StoryItemDto | undefined =
    currentGroup?.stories?.[storyIndex];

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const goToNext = useCallback(() => {
    if (!currentGroup) return;

    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentGroup, storyIndex, groupIndex, storyGroups.length, onClose]);

  const goToPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = storyGroups[groupIndex - 1];
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [storyIndex, groupIndex, storyGroups]);

  // Record view idempotently when currentStory becomes active
  useEffect(() => {
    if (!currentStory) return;

    if (!viewedStoriesSet.current.has(currentStory.id)) {
      viewedStoriesSet.current.add(currentStory.id);
      void storiesService.recordView(currentStory.id).catch(() => {
        // Safe no-op
      });
    }

    // Preload next story media if available
    const nextStory = currentGroup?.stories?.[storyIndex + 1];
    if (nextStory?.media?.url && nextStory.media.kind === "IMAGE") {
      const img = new Image();
      img.src = nextStory.media.url;
    }
  }, [currentStory, currentGroup, storyIndex]);

  // Tab / Document visibility lifecycle
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReplying) return; // Don't intercept while typing reply
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === " ") setIsPaused((prev) => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goToNext, goToPrev, isReplying]);

  // Progress timer for image stories (5 seconds)
  useEffect(() => {
    if (!currentStory || currentStory.media.kind === "VIDEO") return;
    if (isPaused || isHolding || isReplying || showViewers) return;

    const intervalMs = 50;
    const step = (intervalMs / 5000) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentStory, isPaused, isHolding, isReplying, showViewers, goToNext]);

  // Video time update handler
  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const currentProgress = (video.currentTime / video.duration) * 100;
    setProgress(currentProgress);
  };

  const handleVideoEnded = () => {
    goToNext();
  };

  const handleQuickReaction = async (
    reaction: StoryReactionType,
    emoji: string,
  ) => {
    if (!currentStory) return;
    setActiveReaction(emoji);
    showToast(`Reacted ${emoji}`);

    try {
      await storiesService.reactToStory(currentStory.id, reaction);
    } catch {
      // Rollback
    } finally {
      setTimeout(() => setActiveReaction(null), 1000);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStory || !replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await storiesService.createReply(currentStory.id, replyText.trim());
      showToast(`Reply sent to ${currentStory.author.displayName} 🚀`);
      setReplyText("");
      setIsReplying(false);
    } catch {
      showToast("Failed to send reply");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory || isDeleting) return;
    setIsDeleting(true);
    try {
      await storiesService.deleteStory(currentStory.id);
      showToast("Story deleted");
      if (onStoryDeleted) onStoryDeleted(currentStory.id);
      goToNext();
    } catch {
      showToast("Failed to delete story");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTapZone = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isHolding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.35) {
      goToPrev();
    } else {
      goToNext();
    }
  };

  if (!currentStory || !currentGroup || typeof document === "undefined")
    return null;

  const isAuthor = user?.id === currentStory.author.id;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center select-none overflow-hidden touch-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-white text-xs font-semibold shadow-2xl"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Animated Reaction */}
      <AnimatePresence>
        {activeReaction && (
          <motion.div
            initial={{ scale: 0, y: 50, opacity: 0 }}
            animate={{ scale: [1, 1.5, 1.2], y: -80, opacity: 1 }}
            exit={{ scale: 1.8, y: -160, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute z-50 pointer-events-none text-7xl drop-shadow-2xl"
          >
            {activeReaction}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Prev Button */}
      <button
        onClick={goToPrev}
        aria-label="Previous story"
        className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer backdrop-blur-md"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {/* Desktop Next Button */}
      <button
        onClick={goToNext}
        aria-label="Next story"
        className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer backdrop-blur-md"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Main Story Container 9:16 aspect clamp */}
      <div
        onPointerDown={() => setIsHolding(true)}
        onPointerUp={() => setIsHolding(false)}
        onPointerLeave={() => setIsHolding(false)}
        className="relative w-full h-full sm:h-[90vh] sm:max-w-[420px] bg-black sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
      >
        {/* Media Surface */}
        <button
          type="button"
          onClick={handleTapZone}
          aria-label="Story viewer. Tap left or right to navigate."
          className="absolute inset-0 w-full h-full bg-black flex items-center justify-center"
        >
          {currentStory.media.kind === "VIDEO" ? (
            <video
              ref={videoRef}
              src={currentStory.media.url}
              autoPlay
              playsInline
              muted={isMuted}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              className="w-full h-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentStory.media.url}
              alt={currentStory.caption || "Story"}
              className="w-full h-full object-cover"
            />
          )}

          {/* Vignette Overlay for Header & Footer Legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none" />
        </button>

        {/* Top Header & Segmented Progress */}
        <div className="relative z-20 p-3 sm:p-4 space-y-3">
          {/* Segmented Progress Bars */}
          <div className="flex items-center gap-1.5 w-full">
            {currentGroup.stories.map((s, idx) => {
              let segmentProgress = 0;
              if (idx < storyIndex) segmentProgress = 100;
              else if (idx === storyIndex) segmentProgress = progress;

              return (
                <div
                  key={s.id}
                  className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden backdrop-blur-md"
                >
                  <div
                    style={{ width: `${segmentProgress}%` }}
                    className="h-full bg-white transition-all duration-75"
                  />
                </div>
              );
            })}
          </div>

          {/* Author Bar */}
          <div className="flex items-center justify-between">
            <Link
              href={`/profile/${currentStory.author.username}`}
              onClick={onClose}
              className="flex items-center gap-2.5 group"
            >
              <Avatar
                src={currentStory.author.avatarUrl}
                alt={currentStory.author.displayName}
                size="sm"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors">
                    {currentStory.author.displayName}
                  </span>
                  {currentStory.author.isVerified && (
                    <BadgeCheck className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20" />
                  )}
                </div>
                <span className="text-[10px] text-white/70">
                  {new Date(currentStory.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </Link>

            {/* Top Right Controls */}
            <div className="flex items-center gap-1.5">
              {/* Audience Pill */}
              {currentStory.audience === "CLOSE_FRIENDS" && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-emerald-400" />
                  <span>Close Friends</span>
                </span>
              )}
              {currentStory.audience === "FOLLOWERS" && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold text-purple-300 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>Followers</span>
                </span>
              )}

              {/* Video Mute Toggle */}
              {currentStory.media.kind === "VIDEO" && (
                <button
                  onClick={() => setIsMuted((prev) => !prev)}
                  className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/80 transition-colors cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
              )}

              {/* Author Delete Button */}
              {isAuthor && (
                <button
                  onClick={handleDeleteStory}
                  disabled={isDeleting}
                  aria-label="Delete story"
                  className="p-2 rounded-full bg-black/50 backdrop-blur-md text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              {/* Close Modal */}
              <button
                onClick={onClose}
                aria-label="Close story viewer"
                className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Caption Display if present */}
        {currentStory.caption && (
          <div className="relative z-20 px-4 py-2 text-center pointer-events-none">
            <span className="inline-block bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-white text-xs font-medium max-w-[90%]">
              {currentStory.caption}
            </span>
          </div>
        )}

        {/* Bottom Interactive Area */}
        <div className="relative z-20 p-3 sm:p-4 space-y-3">
          {/* Owner Views Button (Instagram Style) */}
          {isAuthor && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowViewers(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold hover:bg-white/20 transition-colors cursor-pointer border border-white/10"
              >
                <Eye className="h-3.5 w-3.5 text-purple-400" />
                <span>{currentStory.viewsCount || 0} viewers</span>
              </button>
            </div>
          )}

          {/* Non-Author Reaction Row & Reply Composer */}
          {!isAuthor && (
            <div className="space-y-2.5">
              {/* Quick 1-Tap Emojis */}
              <div className="flex items-center justify-around bg-black/40 backdrop-blur-md py-1.5 px-2 rounded-2xl border border-white/10">
                {quickEmojis.map((q) => (
                  <button
                    key={q.value}
                    onClick={() => handleQuickReaction(q.value, q.emoji)}
                    className="text-xl hover:scale-130 active:scale-90 transition-transform cursor-pointer p-1"
                  >
                    {q.emoji}
                  </button>
                ))}
              </div>

              {/* Reply Bar */}
              <form
                onSubmit={handleSendReply}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Reply to ${currentStory.author.displayName}...`}
                  value={replyText}
                  onFocus={() => setIsReplying(true)}
                  onBlur={() => setIsReplying(false)}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={1000}
                  className="flex-1 bg-white/[0.12] backdrop-blur-xl border border-white/20 hover:border-white/30 rounded-full px-4 py-2.5 text-xs font-medium text-white placeholder:text-white/45 focus:outline-none focus-visible:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  aria-label="Send reply"
                  className="p-2.5 rounded-full gradient-bg-primary text-white disabled:opacity-40 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg"
                >
                  {isSendingReply ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Story Viewers Sheet Modal */}
      {showViewers && (
        <StoryViewersSheet
          storyId={currentStory.id}
          isOpen={showViewers}
          onClose={() => setShowViewers(false)}
        />
      )}
    </div>,
    document.body,
  );
};
