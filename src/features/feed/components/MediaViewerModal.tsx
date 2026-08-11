"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Post } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  initialMediaIndex?: number;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  onClose,
  post,
  initialMediaIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialMediaIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const mediaList = post.mediaUrls || [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && currentIndex < mediaList.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, mediaList.length, onClose]);

  if (!isOpen || mediaList.length === 0) return null;

  const currentUrl = mediaList[currentIndex];
  const isVideo = post.mediaType === "video" || post.videoUrl;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-0 sm:p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close media viewer"
          className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/70 text-white/80 hover:text-white hover:bg-black transition-colors cursor-pointer"
        >
          <X className="h-6 w-6" />
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-6xl h-full sm:h-[90vh] flex flex-col lg:flex-row overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border border-white/10 glass-panel shadow-2xl"
        >
          {/* Main Media Viewport */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] lg:min-h-full">
            {isVideo ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  src={post.videoUrl || currentUrl}
                  poster={currentUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  controls={false}
                  className="max-h-[85vh] w-full object-contain"
                />
                <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            ) : (
              <img
                src={currentUrl}
                alt={`Media ${currentIndex + 1}`}
                className="max-h-[85vh] w-full object-contain select-none"
              />
            )}

            {/* Navigation Arrows for Carousel */}
            {mediaList.length > 1 && (
              <>
                {currentIndex > 0 && (
                  <button
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                    aria-label="Previous image"
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}
                {currentIndex < mediaList.length - 1 && (
                  <button
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                    aria-label="Next image"
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}

                {/* Pagination Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  {mediaList.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentIndex ? "w-5 bg-purple-400" : "w-2 bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Desktop Right Sidebar Details & Comments */}
          <div className="w-full lg:w-96 p-5 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-between bg-[#0f1422] overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar src={post.user.avatar} alt={post.user.displayName} size="md" />
                <div>
                  <h4 className="font-bold text-sm text-white">{post.user.displayName}</h4>
                  <p className="text-xs text-muted-foreground">@{post.user.username} • {post.createdAt}</p>
                </div>
              </div>

              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{post.content}</p>
            </div>

            {/* Engagement Counts */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground mt-4">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-pink-400 font-bold">
                  <Heart className="h-4 w-4 fill-pink-500" />
                  {post.likesCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  {post.commentsCount}
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="h-4 w-4" />
                  {post.sharesCount}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
