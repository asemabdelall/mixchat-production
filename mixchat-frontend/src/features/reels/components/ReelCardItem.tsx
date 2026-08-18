"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  Send,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Music,
  MapPin,
  UserPlus,
  UserCheck,
  Check,
  Loader2,
} from "lucide-react";
import { type ReelItemDto, reelsService } from "@/services/reels/reelsService";
import { socialService } from "@/services/social/socialService";
import { useAuth } from "@/shared/providers/AuthProvider";
import { CommentsBottomSheet } from "@/features/comments/components/CommentsBottomSheet";
import { ReelShareModal } from "./ReelShareModal";
import { useReelWatchSession } from "../hooks/useReelWatchSession";
import { formatCompactNumber } from "@/lib/formatters";

interface ReelCardItemProps {
  reel: ReelItemDto;
  isActive: boolean;
  shouldPreload: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onReelUpdated?: (updated: ReelItemDto) => void;
}

export const ReelCardItem: React.FC<ReelCardItemProps> = ({
  reel,
  isActive,
  shouldPreload,
  isMuted,
  onToggleMute,
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFollowing, setIsFollowing] = useState(
    reel.author.isFollowing || false,
  );
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [progress, setProgress] = useState(0);

  // Local optimistic states
  const [hasLiked, setHasLiked] = useState(reel.viewerState.hasLiked);
  const [likesCount, setLikesCount] = useState(reel.counts.likesCount);
  const [hasBookmarked, setHasBookmarked] = useState(
    reel.viewerState.hasBookmarked,
  );
  const [bookmarksCount, setBookmarksCount] = useState(
    reel.counts.bookmarksCount,
  );
  const [commentsCount, setCommentsCount] = useState(reel.counts.commentsCount);
  const [viewsCount, setViewsCount] = useState(reel.counts.viewsCount);

  // Watch Telemetry Hook
  const { handlePlay, handlePause, handleEnded } = useReelWatchSession({
    reelId: reel.id,
    isActive,
    videoRef,
    onQualifiedView: () => {
      setViewsCount((prev) => prev + 1);
    },
  });

  // Play/Pause handling when active state changes or comments sheet opens
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && !showComments) {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy fallback: mute and retry
          video.muted = true;
          void video.play().catch(() => {});
        });
      }
    } else {
      video.pause();
    }

    return () => video.pause();
  }, [isActive, showComments]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 1;
      setProgress((current / duration) * 100);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (progressBarRef.current && videoRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const seekRatio = Math.max(0, Math.min(1, clickX / width));
      const targetTime = seekRatio * (videoRef.current.duration || 0);
      videoRef.current.currentTime = targetTime;
      setProgress(seekRatio * 100);
    }
  };

  const handleSeekKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!videoRef.current || !["ArrowLeft", "ArrowRight"].includes(e.key)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const direction = e.key === "ArrowRight" ? 5 : -5;
    const duration = videoRef.current.duration || 0;
    const targetTime = Math.max(
      0,
      Math.min(duration, videoRef.current.currentTime + direction),
    );
    videoRef.current.currentTime = targetTime;
    setProgress(duration > 0 ? (targetTime / duration) * 100 : 0);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        void videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Double-tap to like
  const handleDoubleTap = async () => {
    setShowDoubleTapHeart(true);
    setTimeout(() => setShowDoubleTapHeart(false), 900);

    if (!hasLiked) {
      setHasLiked(true);
      setLikesCount((prev) => prev + 1);
      try {
        const res = await reelsService.likeReel(reel.id);
        setLikesCount(res.likesCount);
      } catch (err) {
        console.error("Like failed", err);
        setHasLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  // Like / Unlike Toggle
  const handleToggleLike = async () => {
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));

    try {
      if (nextLiked) {
        const res = await reelsService.likeReel(reel.id);
        setLikesCount(res.likesCount);
      } else {
        const res = await reelsService.unlikeReel(reel.id);
        setLikesCount(res.likesCount);
      }
    } catch (err) {
      console.error("Toggle like failed", err);
      // Rollback
      setHasLiked(!nextLiked);
      setLikesCount((prev) => Math.max(0, prev + (nextLiked ? -1 : 1)));
    }
  };

  // Bookmark / Save Toggle
  const handleToggleBookmark = async () => {
    const nextBookmarked = !hasBookmarked;
    setHasBookmarked(nextBookmarked);
    setBookmarksCount((prev) => Math.max(0, prev + (nextBookmarked ? 1 : -1)));

    try {
      if (nextBookmarked) {
        const res = await reelsService.bookmarkReel(reel.id);
        setBookmarksCount(res.bookmarksCount);
      } else {
        const res = await reelsService.unbookmarkReel(reel.id);
        setBookmarksCount(res.bookmarksCount);
      }
    } catch (err) {
      console.error("Toggle bookmark failed", err);
      // Rollback
      setHasBookmarked(!nextBookmarked);
      setBookmarksCount((prev) =>
        Math.max(0, prev + (nextBookmarked ? -1 : 1)),
      );
    }
  };

  // Follow / Unfollow Creator
  const handleToggleFollow = async () => {
    if (reel.author.id === user?.id) return;
    const nextFollow = !isFollowing;
    setIsFollowing(nextFollow);

    try {
      if (nextFollow) {
        await socialService.followUser(reel.author.id);
      } else {
        await socialService.unfollowUser(reel.author.id);
      }
    } catch (err) {
      console.error("Toggle follow failed", err);
      setIsFollowing(!nextFollow);
    }
  };

  const isSelf = reel.author.id === user?.id;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black snap-start overflow-hidden select-none">
      {/* Background Video Element */}
      <video
        ref={videoRef}
        src={reel.video.url}
        poster={reel.video.posterUrl || undefined}
        preload={isActive ? "auto" : shouldPreload ? "metadata" : "none"}
        loop
        playsInline
        muted={isMuted}
        onPlay={() => {
          setIsPlaying(true);
          handlePlay();
        }}
        onPause={() => {
          setIsPlaying(false);
          handlePause();
        }}
        onEnded={handleEnded}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlayPause}
        onDoubleClick={handleDoubleTap}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            togglePlayPause();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={isPlaying ? "Pause reel" : "Play reel"}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Subtle Gradient Overlays for Readability */}
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 via-black/25 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

      {/* Floating Mute/Unmute Control (Top Right) */}
      <button
        onClick={onToggleMute}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        className="absolute top-16 lg:top-4 right-4 z-30 p-2.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/20 text-white hover:scale-110 active:scale-90 transition-transform cursor-pointer shadow-xl"
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-pink-300" />
        ) : (
          <Volume2 className="h-4 w-4 text-cyan-300" />
        )}
      </button>

      {/* Center Double-Tap Animated Heart Overlay */}
      {showDoubleTapHeart && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-200">
          <Heart className="h-28 w-28 fill-pink-500 text-pink-400 drop-shadow-[0_0_35px_rgba(236,72,153,0.9)] animate-bounce" />
        </div>
      )}

      {/* Center Pause Indicator Overlay when Paused */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlayPause}
          aria-label="Play reel"
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 cursor-pointer"
        >
          <div className="p-5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-2xl animate-in zoom-in-75 duration-150">
            <Play className="h-10 w-10 fill-white translate-x-0.5" />
          </div>
        </button>
      )}

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="p-3 rounded-full bg-black/50 backdrop-blur-md">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
          </div>
        </div>
      )}

      {/* Right Action Bar (TikTok/Reels Layout) */}
      <div className="absolute right-3.5 bottom-[calc(2.5rem+env(safe-area-inset-bottom,0px))] z-30 flex flex-col items-center gap-4 select-none">
        {/* Author Profile Avatar + Follow CTA Badge */}
        <div className="relative mb-2">
          <Link href={`/profile/${reel.author.username}`}>
            <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-500 shadow-xl hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    reel.author.avatarUrl ||
                    "/mixchat-icon.png"
                  }
                  alt={reel.author.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </Link>
          {!isSelf && (
            <button
              onClick={handleToggleFollow}
              aria-label={isFollowing ? "Following" : "Follow creator"}
              className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full p-1 shadow-md cursor-pointer transition-transform hover:scale-110 ${
                isFollowing
                  ? "bg-emerald-500 text-white"
                  : "gradient-bg-primary text-white"
              }`}
            >
              {isFollowing ? (
                <UserCheck className="h-3 w-3" />
              ) : (
                <UserPlus className="h-3 w-3 stroke-[2.5]" />
              )}
            </button>
          )}
        </div>

        {/* Like Button */}
        <button
          onClick={handleToggleLike}
          className="flex flex-col items-center gap-1 text-white group cursor-pointer active:scale-90 transition-transform"
        >
          <div
            className={`p-3 rounded-full backdrop-blur-md border border-white/10 shadow-lg ${
              hasLiked
                ? "bg-pink-500/25 border-pink-500/50 text-pink-400"
                : "bg-black/50 text-white"
            }`}
          >
            <Heart
              className={`h-6 w-6 transition-transform group-hover:scale-110 ${
                hasLiked ? "fill-pink-500 text-pink-500" : "text-white"
              }`}
            />
          </div>
          <span className="text-[11px] font-black drop-shadow-md">
            {formatCompactNumber(likesCount)}
          </span>
        </button>

        {/* Comment Button */}
        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1 text-white group cursor-pointer active:scale-90 transition-transform"
        >
          <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-lg">
            <MessageSquare className="h-6 w-6 transition-transform group-hover:scale-110" />
          </div>
          <span className="text-[11px] font-black drop-shadow-md">
            {formatCompactNumber(commentsCount)}
          </span>
        </button>

        {/* Save / Bookmark Button */}
        <button
          onClick={handleToggleBookmark}
          className="flex flex-col items-center gap-1 text-white group cursor-pointer active:scale-90 transition-transform"
        >
          <div
            className={`p-3 rounded-full backdrop-blur-md border border-white/10 shadow-lg ${
              hasBookmarked
                ? "bg-purple-500/25 border-purple-500/50 text-purple-300"
                : "bg-black/50 text-white"
            }`}
          >
            <Bookmark
              className={`h-6 w-6 transition-transform group-hover:scale-110 ${
                hasBookmarked ? "fill-purple-400 text-purple-400" : "text-white"
              }`}
            />
          </div>
          <span className="text-[11px] font-black drop-shadow-md">
            {formatCompactNumber(bookmarksCount)}
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => setShowShareModal(true)}
          className="flex flex-col items-center gap-1 text-white group cursor-pointer active:scale-90 transition-transform"
        >
          <div className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-lg">
            <Send className="h-6 w-6 transition-transform group-hover:scale-110" />
          </div>
          <span className="text-[11px] font-black drop-shadow-md">
            {formatCompactNumber(viewsCount)}
          </span>
        </button>

        {/* Vinyl Music Record Disc */}
        <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-black/80 flex items-center justify-center shadow-2xl animate-spin-slow">
          <Music className="h-4 w-4 text-cyan-300" />
        </div>
      </div>

      {/* Bottom-Left Information Overlay */}
      <div className="absolute left-3.5 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-20 z-30 space-y-2 text-white select-none">
        {/* Author Header */}
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${reel.author.username}`}
            className="flex items-center gap-1.5 group"
          >
            <span className="font-extrabold text-sm text-white group-hover:text-purple-300 transition-colors drop-shadow-md">
              {reel.author.displayName}
            </span>
            {reel.author.isVerified && (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white text-[8px] shrink-0">
                <Check className="h-2 w-2 stroke-[3]" />
              </span>
            )}
            <span className="text-xs text-white/60 font-medium drop-shadow-md">
              @{reel.author.username}
            </span>
          </Link>
          <span className="text-xs text-white/50">
            • {new Date(reel.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Caption */}
        {reel.caption && (
          <div className="text-xs text-white/95 leading-relaxed drop-shadow-md max-w-md">
            <p className={isCaptionExpanded ? "" : "line-clamp-2"}>
              {reel.caption}
            </p>
            {reel.caption.length > 80 && (
              <button
                onClick={() => setIsCaptionExpanded((prev) => !prev)}
                className="text-purple-300 font-bold hover:underline text-[11px] mt-0.5 cursor-pointer"
              >
                {isCaptionExpanded ? "less" : "...more"}
              </button>
            )}
          </div>
        )}

        {/* Location & Audio Soundtrack Badge */}
        <div className="flex items-center gap-2.5 pt-0.5 text-xs text-white/90">
          {reel.locationTag && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-300 drop-shadow-md">
              <MapPin className="h-3 w-3 text-purple-400" />
              <span>{reel.locationTag}</span>
            </div>
          )}

          {reel.audioTitle && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold bg-black/50 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 shrink-0">
              <Music className="h-3 w-3 text-cyan-400 animate-spin-slow" />
              <span className="truncate max-w-[130px]">
                🎵 {reel.audioTitle}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Video Progress Scrubber Bar at the Very Bottom */}
      <div
        ref={progressBarRef}
        onClick={handleSeek}
        onKeyDown={handleSeekKeyDown}
        role="slider"
        tabIndex={0}
        aria-label="Reel playback position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="absolute bottom-0 inset-x-0 min-h-11 bg-transparent cursor-pointer z-40 group flex items-end"
      >
        <div
          className="h-1.5 group-hover:h-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 relative transition-all"
          style={{ width: `${progress}%` }}
        >
          <div className="opacity-0 group-hover:opacity-100 absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md transition-opacity" />
        </div>
      </div>

      {/* Unified Instagram-Grade Comments Sheet (Same as Posts) */}
      <CommentsBottomSheet
        reelId={reel.id}
        commentsCount={commentsCount}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onCommentsCountChange={(newCount) => {
          setCommentsCount(newCount);
        }}
      />

      {/* Reel Share Modal */}
      <ReelShareModal
        reel={reel}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};
