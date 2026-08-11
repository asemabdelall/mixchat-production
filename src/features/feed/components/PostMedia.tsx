"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Heart } from "lucide-react";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
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
      className="relative rounded-2xl overflow-hidden mb-4 border border-white/10 select-none bg-black/40 group cursor-pointer"
    >
      {/* Video Content */}
      {isVideo ? (
        <div className="relative w-full max-h-[440px] flex items-center justify-center bg-black">
          <img
            src={mediaList[0]}
            alt="Video Thumbnail"
            className="w-full max-h-[440px] object-cover"
            onClick={() => onOpenViewer(0)}
          />
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
          >
            <div className="p-4 rounded-full gradient-bg-primary text-white shadow-xl hover:scale-110 transition-transform">
              {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 translate-x-0.5" />}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="absolute bottom-3 right-3 p-2 rounded-full bg-black/70 text-white backdrop-blur-md hover:bg-black transition-colors"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      ) : mediaList.length > 1 ? (
        /* Carousel Content */
        <div className="relative w-full max-h-[440px] overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out h-full"
            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
          >
            {mediaList.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Media ${idx + 1}`}
                onClick={() => onOpenViewer(idx)}
                className="w-full shrink-0 max-h-[440px] object-cover"
              />
            ))}
          </div>

          {/* Controls */}
          {carouselIndex > 0 && (
            <button
              onClick={handlePrevCarousel}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors z-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {carouselIndex < mediaList.length - 1 && (
            <button
              onClick={handleNextCarousel}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors z-10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 z-10">
            {mediaList.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCarouselIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  idx === carouselIndex ? "w-4 bg-purple-400" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Single Image */
        <img
          src={mediaList[0]}
          alt="Post Media"
          onClick={() => onOpenViewer(0)}
          className="w-full max-h-[440px] object-cover transition-transform duration-300 group-hover:scale-[1.01]"
        />
      )}

      {/* Double Tap Heart Overlay */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.3 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs pointer-events-none z-20"
          >
            <Heart className="h-20 w-20 fill-pink-500 text-pink-500 drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
