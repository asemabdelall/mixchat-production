"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Post } from "@/types";

interface PostMediaProps {
  post: Post;
  onOpenViewer: (index: number) => void;
  onDoubleTapLike?: () => void;
}

export const PostMedia: React.FC<PostMediaProps> = ({
  post,
  onOpenViewer,
  onDoubleTapLike,
}) => {
  const mediaList = post.mediaUrls || [];
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);

  if (mediaList.length === 0) return null;

  const isVideo = post.mediaType === "video" || post.videoUrl;

  const handleMediaDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHeart(true);
    if (onDoubleTapLike) onDoubleTapLike();
    setTimeout(() => setShowHeart(false), 800);
  };

  const handleNextCarousel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (carouselIndex < mediaList.length - 1) {
      setCarouselIndex((prev) => prev + 1);
    }
  };

  const handlePrevCarousel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (carouselIndex > 0) {
      setCarouselIndex((prev) => prev - 1);
    }
  };

  return (
    <div
      onDoubleClick={handleMediaDoubleTap}
      className="relative rounded-2xl sm:rounded-3xl overflow-hidden mb-4 border border-white/10 select-none bg-black/50 group cursor-pointer shadow-lg"
    >
      {/* Video Content */}
      {isVideo ? (
        <div className="relative w-full max-h-[480px] min-h-[260px] flex items-center justify-center bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaList[0]}
            alt="Video Thumbnail"
            className="w-full max-h-[480px] object-cover"
            onClick={() => onOpenViewer(0)}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenViewer(0);
            }}
            aria-label="Open video"
            className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/15 transition-colors"
          >
            <div className="p-4 rounded-full gradient-bg-primary text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform">
              <Play className="h-6 w-6 translate-x-0.5" />
            </div>
          </button>
        </div>
      ) : mediaList.length > 1 ? (
        /* Carousel Content */
        <div className="relative w-full max-h-[480px] min-h-[260px] overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out h-full"
            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
          >
            {mediaList.map((url, idx) => (
              <div
                key={idx}
                className="w-full shrink-0 max-h-[480px] bg-black/40 flex items-center justify-center"
              >
                <button type="button" onClick={() => onOpenViewer(idx)} className="w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Open media ${idx + 1}`}
                    className="w-full max-h-[480px] object-cover"
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Carousel Counter Badge (Top Right) */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white shadow-md z-10">
            {carouselIndex + 1}/{mediaList.length}
          </div>

          {/* Carousel Nav Arrows */}
          {carouselIndex > 0 && (
            <button
              onClick={handlePrevCarousel}
              aria-label="Previous photo"
            className="absolute left-2.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all active:scale-90 z-10 shadow-md"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {carouselIndex < mediaList.length - 1 && (
            <button
              onClick={handleNextCarousel}
              aria-label="Next photo"
              className="absolute right-2.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all active:scale-90 z-10 shadow-md"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Dots Indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 z-10 shadow-md">
            {mediaList.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCarouselIndex(idx);
                }}
                aria-label={`Show media ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === carouselIndex
                    ? "w-4 bg-gradient-to-r from-purple-400 to-pink-400"
                    : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Single Image */
        <div className="w-full max-h-[480px] min-h-[220px] bg-black/40 flex items-center justify-center">
          <button type="button" onClick={() => onOpenViewer(0)} className="w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaList[0]}
              alt="Open post media"
              className="w-full max-h-[480px] object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            />
          </button>
        </div>
      )}

      {/* Double Tap Heart Burst Animation */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs pointer-events-none z-20"
          >
            <Heart className="h-24 w-24 fill-pink-500 text-pink-500 drop-shadow-[0_0_30px_rgba(236,72,153,0.9)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
