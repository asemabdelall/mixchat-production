"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Flame,
  Users,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Film,
} from "lucide-react";
import { ReelCardItem } from "./ReelCardItem";
import { CreateReelModal } from "./CreateReelModal";
import { reelsService, type ReelItemDto } from "@/services/reels/reelsService";

const MAX_MOUNTED_REELS = 30;

export const ReelFeedViewer: React.FC = () => {
  const searchParams = useSearchParams();
  const initialReelIdParam = searchParams.get("id");

  const containerRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [reels, setReels] = useState<ReelItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Load more pages
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    setIsLoadingMore(true);
    setError(null);

    try {
      const res = await reelsService.getFeed(tab, nextCursor, 10);
      setHasMore(res.hasMore);
      setReels((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newItems = res.items.filter((r) => !existingIds.has(r.id));
        const nextItems = [...prev, ...newItems].slice(0, MAX_MOUNTED_REELS);
        if (nextItems.length >= MAX_MOUNTED_REELS) setHasMore(false);
        return nextItems;
      });
      setNextCursor(res.nextCursor || null);
    } catch {
      setError("More reels could not be loaded.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextCursor, tab]);

  useEffect(() => {
    let isMounted = true;

    const fetchInitial = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await reelsService.getFeed(tab, undefined, 10);
        if (!isMounted) return;

        let combinedItems = res.items;
        if (
          initialReelIdParam &&
          !res.items.some((r) => r.id === initialReelIdParam)
        ) {
          try {
            const single = await reelsService.getReel(initialReelIdParam);
            combinedItems = [
              single,
              ...res.items.filter((r) => r.id !== single.id),
            ];
          } catch {
            setError("The linked reel is unavailable; showing the feed instead.");
          }
        }

        if (isMounted) {
          setReels(combinedItems);
          setActiveIndex(0);
          setNextCursor(res.nextCursor || null);
          setHasMore(res.hasMore);
        }
      } catch {
        if (isMounted) setError("Reels could not be loaded. Please try again.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchInitial();

    return () => {
      isMounted = false;
    };
  }, [tab, initialReelIdParam, reloadKey]);

  const scrollToReel = useCallback(
    (index: number) => {
      if (index >= 0 && index < reels.length && containerRef.current) {
        const target = containerRef.current.children[index] as HTMLElement;
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
          setActiveIndex(index);
        }
      }
    },
    [reels.length],
  );

  // Handle scroll snap events to detect current active reel
  const handleScroll = () => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      const scrollTop = containerRef.current.scrollTop;
      const calculatedIndex = Math.round(scrollTop / containerHeight);

      if (
        calculatedIndex >= 0 &&
        calculatedIndex < reels.length &&
        calculatedIndex !== activeIndex
      ) {
        setActiveIndex(calculatedIndex);
      }

      // Trigger prefetch for next page when 3 items from bottom
      if (
        calculatedIndex >= reels.length - 3 &&
        hasMore &&
        !isLoadingMore &&
        nextCursor
      ) {
        void loadMore();
      }
    }
  };

  // Keyboard navigation for desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollToReel(activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollToReel(activeIndex - 1);
      } else if (e.key === "m" || e.key === "M") {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, scrollToReel]);

  const activeReel = reels[activeIndex];

  return (
    <div className="relative w-full h-full bg-[#070913] overflow-hidden flex items-center justify-center select-none">
      {/* Ambient Glow / Backdrop */}
      {activeReel?.video.posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeReel.video.posterUrl}
          alt="Ambient Blur"
          className="hidden lg:block absolute inset-0 w-full h-full object-cover filter blur-3xl opacity-20 scale-125 pointer-events-none transition-all duration-700"
        />
      )}

      {/* Top Floating Category Switcher, Back Button & Create Button */}
      <div className="absolute top-0 inset-x-0 z-40 flex items-center justify-between px-3.5 sm:px-6 pt-safe-reels pb-3 pointer-events-none">
        {/* Back Button to Feed */}
        <Link
          href="/feed"
          aria-label="Back to feed"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/50 hover:bg-white/20 active:scale-90 text-white text-xs font-bold backdrop-blur-xl border border-white/15 shadow-xl pointer-events-auto transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Feed</span>
        </Link>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xl p-1 rounded-full border border-white/10 pointer-events-auto shadow-xl">
          <button
            type="button"
            aria-pressed={tab === "foryou"}
            onClick={() => {
              if (tab !== "foryou") {
                setTab("foryou");
              }
            }}
            className={`flex min-h-11 items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              tab === "foryou"
                ? "gradient-bg-primary text-white shadow-md shadow-purple-500/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>For You</span>
          </button>

          <button
            type="button"
            aria-pressed={tab === "following"}
            onClick={() => {
              if (tab !== "following") {
                setTab("following");
              }
            }}
            className={`flex min-h-11 items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              tab === "following"
                ? "gradient-bg-primary text-white shadow-md shadow-purple-500/30"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Following</span>
          </button>
        </div>

        {/* Create Reel CTA */}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          aria-label="Create reel"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold backdrop-blur-xl border border-white/15 shadow-xl pointer-events-auto transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Create Reel</span>
        </button>
      </div>

      {/* Main Snap Feed Container */}
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Desktop Phone Frame Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full lg:max-w-[420px] lg:h-[96dvh] lg:max-h-[860px] lg:aspect-[9/16] lg:rounded-[32px] overflow-y-auto custom-scrollbar scrollbar-none snap-y snap-mandatory bg-black lg:border lg:border-white/15 lg:shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10"
        >
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              <p className="text-xs text-muted-foreground font-medium">
                Loading {tab === "foryou" ? "For You" : "Following"} Reels...
              </p>
            </div>
          ) : error && reels.length === 0 ? (
            <div role="alert" className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
              <p className="text-sm font-semibold text-rose-200">{error}</p>
              <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="min-h-11 rounded-2xl gradient-bg-primary px-5 text-xs font-bold">
                Retry
              </button>
            </div>
          ) : reels.length > 0 ? (
            reels.map((reel, index) => (
              <ReelCardItem
                key={reel.id}
                reel={reel}
                isActive={index === activeIndex}
                shouldPreload={Math.abs(index - activeIndex) <= 1}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((prev) => !prev)}
                onNext={() => scrollToReel(activeIndex + 1)}
                onPrev={() => scrollToReel(activeIndex - 1)}
              />
            ))
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-white space-y-4">
              <div className="p-4 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Film className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">
                  {tab === "following"
                    ? "No Reels from creators you follow"
                    : "No Reels available yet"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {tab === "following"
                    ? "Follow creators on MixChat or check out the For You feed to discover trending vertical videos."
                    : "Be the first creator to upload and publish a vertical short reel!"}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                {tab === "following" ? (
                  <button
                    type="button"
                    onClick={() => setTab("foryou")}
                    className="min-h-11 px-4 py-2 rounded-2xl gradient-bg-primary text-white text-xs font-bold shadow-lg shadow-purple-500/25 cursor-pointer"
                  >
                    Explore For You
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="min-h-11 px-4 py-2 rounded-2xl gradient-bg-primary text-white text-xs font-bold shadow-lg shadow-purple-500/25 cursor-pointer"
                  >
                    Create First Reel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReloadKey((prev) => prev + 1)}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  aria-label="Refresh reels"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Side Navigation Arrows */}
        <div className="hidden lg:flex flex-col items-center gap-3 absolute right-8 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={() => scrollToReel(activeIndex - 1)}
            disabled={activeIndex === 0 || isLoading}
            aria-label="Previous reel"
            className="p-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white hover:bg-white/20 hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xl"
          >
            <ChevronUp className="h-6 w-6 stroke-[2.5]" />
          </button>
          <span className="text-[11px] font-bold text-white/50 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            {reels.length > 0
              ? `${activeIndex + 1} / ${reels.length}`
              : "0 / 0"}
          </span>
          <button
            onClick={() => scrollToReel(activeIndex + 1)}
            disabled={activeIndex >= reels.length - 1 || isLoading}
            aria-label="Next reel"
            className="p-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white hover:bg-white/20 hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-xl"
          >
            <ChevronDown className="h-6 w-6 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Create Reel Modal */}
      <CreateReelModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onReelCreated={(newReel) => {
          setReels((prev) => [newReel, ...prev].slice(0, MAX_MOUNTED_REELS));
          setActiveIndex(0);
        }}
      />
    </div>
  );
};
