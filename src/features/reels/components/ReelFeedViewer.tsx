"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useReels } from "@/shared/providers/ReelsProvider";
import { ReelCardItem } from "./ReelCardItem";

export const ReelFeedViewer: React.FC = () => {
  const searchParams = useSearchParams();
  const { reels } = useReels();
  const containerRef = useRef<HTMLDivElement>(null);

  const initialReelIdParam = searchParams.get("id");
  const initialIndex = reels.findIndex((r) => r.id === initialReelIdParam);
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  // Auto-scroll to initial reel if passed in query param
  useEffect(() => {
    if (initialIndex >= 0 && containerRef.current) {
      const child = containerRef.current.children[initialIndex] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [initialIndex]);

  // Handle scroll events to detect current active snap reel index
  const handleScroll = () => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      const scrollTop = containerRef.current.scrollTop;
      const calculatedIndex = Math.round(scrollTop / containerHeight);

      if (calculatedIndex >= 0 && calculatedIndex < reels.length && calculatedIndex !== activeIndex) {
        setActiveIndex(calculatedIndex);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full h-[100dvh] overflow-y-auto custom-scrollbar scrollbar-none snap-y snap-mandatory bg-black select-none"
    >
      {reels.map((reel, index) => (
        <ReelCardItem key={reel.id} reel={reel} isActive={index === activeIndex} />
      ))}
    </div>
  );
};
