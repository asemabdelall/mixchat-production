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
  Sparkles 
} from "lucide-react";
import { Reel } from "../types/reelTypes";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useReels } from "@/shared/providers/ReelsProvider";
import { ReelCommentsSheet } from "./ReelCommentsSheet";
import { ReelShareModal } from "./ReelShareModal";

interface ReelCardItemProps {
  reel: Reel;
  isActive: boolean;
}

export const ReelCardItem: React.FC<ReelCardItemProps> = ({ reel, isActive }) => {
  const { toggleLikeReel, toggleSaveReel } = useReels();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);

  // Play/Pause handling when active state changes
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => {
              // Autoplay failed, fallback to muted play
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                videoRef.current.play();
              }
            });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleDoubleTap = () => {
    if (!reel.isLiked) {
      toggleLikeReel(reel.id);
    }
    setShowDoubleTapHeart(true);
    setTimeout(() => setShowDoubleTapHeart(false), 900);
  };

  return (
    <div className="relative w-full h-[100dvh] flex items-center justify-center bg-black snap-start overflow-hidden select-none">
      {/* Background Video Element */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.posterUrl}
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlayPause}
        onDoubleClick={handleDoubleTap}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Subtle Gradient Overlays for Readability */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      {/* Floating Mute/Unmute Control (Top Right) */}
      <button
        onClick={() => setIsMuted((prev) => !prev)}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        className="absolute top-6 right-6 z-30 p-2.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white hover:scale-110 transition-transform cursor-pointer shadow-lg"
      >
        {isMuted ? <VolumeX className="h-5 w-5 text-pink-300" /> : <Volume2 className="h-5 w-5 text-cyan-300" />}
      </button>

      {/* Center Double-Tap Animated Heart Overlay */}
      {showDoubleTapHeart && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-300">
          <Heart className="h-24 w-24 fill-pink-500 text-pink-400 drop-shadow-[0_0_25px_rgba(236,72,153,0.8)]" />
        </div>
      )}

      {/* Center Pause Indicator Overlay when Paused */}
      {!isPlaying && (
        <div
          onClick={togglePlayPause}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 cursor-pointer"
        >
          <div className="p-5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-2xl animate-in zoom-in-75 duration-150">
            <Play className="h-10 w-10 fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Right-Side Interactive Action Rail */}
      <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-5">
        {/* Author Profile Avatar + Follow CTA Badge */}
        <div className="relative mb-2">
          <Link href={`/profile/${reel.author.username}`}>
            <div className="story-ring-active p-0.5 rounded-full shadow-2xl hover:scale-105 transition-transform">
              <Avatar src={reel.author.avatar} alt={reel.author.displayName} size="md" isVerified={reel.author.role === "verified"} />
            </div>
          </Link>
          <button
            onClick={() => setIsFollowing((prev) => !prev)}
            aria-label={isFollowing ? "Following" : "Follow creator"}
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full p-1 shadow-md cursor-pointer transition-transform hover:scale-110 ${
              isFollowing ? "bg-emerald-500 text-white" : "gradient-bg-primary text-white"
            }`}
          >
            {isFollowing ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
          </button>
        </div>

        {/* Like Button */}
        <button
          onClick={() => toggleLikeReel(reel.id)}
          className="flex flex-col items-center gap-1 text-white group cursor-pointer"
        >
          <div className={`p-3 rounded-full backdrop-blur-md border border-white/10 transition-transform group-hover:scale-110 shadow-lg ${
            reel.isLiked ? "bg-pink-500/20 border-pink-500/40 text-pink-400" : "bg-black/40 text-white"
          }`}>
            <Heart className={`h-6 w-6 transition-colors ${reel.isLiked ? "fill-pink-500 text-pink-500" : "text-white"}`} />
          </div>
          <span className="text-[11px] font-extrabold drop-shadow-md">{reel.likesCount}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1 text-white group cursor-pointer"
        >
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white transition-transform group-hover:scale-110 shadow-lg">
            <MessageSquare className="h-6 w-6" />
          </div>
          <span className="text-[11px] font-extrabold drop-shadow-md">{reel.commentsCount}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => setShowShareModal(true)}
          className="flex flex-col items-center gap-1 text-white group cursor-pointer"
        >
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white transition-transform group-hover:scale-110 shadow-lg">
            <Send className="h-6 w-6" />
          </div>
          <span className="text-[11px] font-extrabold drop-shadow-md">{reel.sharesCount}</span>
        </button>

        {/* Save Bookmark Button */}
        <button
          onClick={() => toggleSaveReel(reel.id)}
          className="flex flex-col items-center gap-1 text-white group cursor-pointer"
        >
          <div className={`p-3 rounded-full backdrop-blur-md border border-white/10 transition-transform group-hover:scale-110 shadow-lg ${
            reel.isSaved ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-black/40 text-white"
          }`}>
            <Bookmark className={`h-6 w-6 transition-colors ${reel.isSaved ? "fill-purple-400 text-purple-400" : "text-white"}`} />
          </div>
          <span className="text-[11px] font-extrabold drop-shadow-md">{reel.isSaved ? "Saved" : "Save"}</span>
        </button>
      </div>

      {/* Bottom-Left Information Overlay */}
      <div className="absolute left-4 bottom-8 right-20 z-30 space-y-2.5 text-white select-none">
        {/* Discovery Reason Tag */}
        {reel.discoveryReason && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-600/80 backdrop-blur-md text-[10px] font-bold text-white shadow-md border border-purple-400/40">
            <Sparkles className="h-3 w-3 text-pink-300" />
            <span>{reel.discoveryReason}</span>
          </div>
        )}

        {/* Author Header */}
        <div className="flex items-center gap-2">
          <Link href={`/profile/${reel.author.username}`} className="flex items-center gap-1.5 group">
            <span className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors drop-shadow-md">
              {reel.author.displayName}
            </span>
            <span className="text-xs text-muted-foreground font-medium drop-shadow-md">@{reel.author.username}</span>
          </Link>
          <span className="text-xs text-muted-foreground">• {reel.createdAt}</span>
        </div>

        {/* Caption */}
        <div className="text-xs text-white/95 leading-relaxed drop-shadow-md max-w-md">
          <p className={isCaptionExpanded ? "" : "line-clamp-2"}>{reel.caption}</p>
          {reel.caption.length > 80 && (
            <button
              onClick={() => setIsCaptionExpanded((prev) => !prev)}
              className="text-purple-300 font-bold hover:underline text-[11px] mt-0.5 cursor-pointer"
            >
              {isCaptionExpanded ? "less" : "...more"}
            </button>
          )}
        </div>

        {/* Hashtags */}
        {reel.hashtags && reel.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {reel.hashtags.map((tag) => (
              <Link
                key={tag}
                href={`/hashtag/${tag.replace("#", "")}`}
                className="text-[11px] font-bold text-purple-300 hover:text-purple-200 drop-shadow-md"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Location & Audio Soundtrack Badge */}
        <div className="flex items-center gap-3 pt-1 text-xs text-white/90">
          {reel.locationTag && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-300 drop-shadow-md">
              <MapPin className="h-3 w-3 text-purple-400" />
              <span>{reel.locationTag}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] font-semibold bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shrink-0">
            <Music className="h-3 w-3 text-cyan-400 animate-spin-slow" />
            <span className="truncate max-w-[140px]">🎵 {reel.audio.title}</span>
          </div>
        </div>
      </div>

      {/* Reel Comments Sheet */}
      <ReelCommentsSheet reel={reel} isOpen={showComments} onClose={() => setShowComments(false)} />

      {/* Reel Share Modal */}
      <ReelShareModal reel={reel} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </div>
  );
};
