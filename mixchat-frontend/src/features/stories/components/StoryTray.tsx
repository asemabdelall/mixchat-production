"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/shared/providers/AuthProvider";
import {
  storiesService,
  StoryGroupDto,
} from "@/services/stories/storiesService";
import { StoryViewerModal } from "./StoryViewerModal";
import { CreateStoryModal } from "./CreateStoryModal";
import { AvatarImage } from "@/shared/components/ui/AvatarImage";

export const StoryTray: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroupDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const fetchActiveStories = useCallback(async () => {
    setError(null);
    try {
      const res = await storiesService.getActiveStories();
      setGroups(res.groups);
    } catch {
      setError("Stories are temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      await fetchActiveStories();
    };
    if (isMounted) {
      void load();
    }
    return () => {
      isMounted = false;
    };
  }, [fetchActiveStories]);

  const checkScrollability = () => {
    const el = scrollContainerRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScrollability, { passive: true });
      window.addEventListener("resize", checkScrollability);
      return () => {
        el.removeEventListener("scroll", checkScrollability);
        window.removeEventListener("resize", checkScrollability);
      };
    }
  }, [groups.length]);

  const scrollByAmount = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = direction === "left" ? -300 : 300;
      el.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleStoryCreated = () => {
    void fetchActiveStories();
  };

  const handleStoryDeleted = () => {
    void fetchActiveStories();
  };

  // Find own group if user has active stories
  const ownGroupIndex = groups.findIndex((g) => g.author.id === user?.id);
  const ownGroup = ownGroupIndex !== -1 ? groups[ownGroupIndex] : null;

  // Other groups to render
  const otherGroups = groups.filter((g) => g.author.id !== user?.id);

  return (
    <>
      <div className="relative group w-full mb-6 select-none">
        {/* Left Arrow Navigation Button (Desktop) */}
        {canScrollLeft && (
          <button
            onClick={() => scrollByAmount("left")}
            aria-label="Scroll stories left"
            className="hidden md:flex absolute left-0 top-[34px] -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-[#090c15]/90 border border-white/20 text-white shadow-xl backdrop-blur-md hover:scale-110 active:scale-95 transition-all cursor-pointer hover:bg-purple-600/80"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Right Arrow Navigation Button (Desktop) */}
        {canScrollRight && (
          <button
            onClick={() => scrollByAmount("right")}
            aria-label="Scroll stories right"
            className="hidden md:flex absolute right-0 top-[34px] -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-[#090c15]/90 border border-white/20 text-white shadow-xl backdrop-blur-md hover:scale-110 active:scale-95 transition-all cursor-pointer hover:bg-purple-600/80"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Horizontal Scrollable Stories Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-start gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth px-1 py-1"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* "Your Story" Item (Instagram Style) */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 group/story">
            <div className="relative">
              {/* Outer Padding Ring */}
              <div
                onClick={() => {
                  if (ownGroup) {
                    setActiveGroupIndex(ownGroupIndex);
                  } else {
                    setIsCreateStoryOpen(true);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (ownGroup) setActiveGroupIndex(ownGroupIndex);
                    else setIsCreateStoryOpen(true);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={ownGroup ? "Open your story" : "Create a story"}
                className={`p-[2.5px] rounded-full transition-transform duration-200 group-hover/story:scale-105 group-active/story:scale-95 cursor-pointer ${
                  ownGroup
                    ? ownGroup.hasUnseen
                      ? "bg-gradient-to-tr from-[#f59e0b] via-[#ec4899] via-[#8b5cf6] to-[#06b6d4] shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                      : "bg-white/20"
                    : "border-transparent"
                }`}
              >
                <div className="p-[2px] bg-[#090c15] rounded-full">
                  <div className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full overflow-hidden bg-white/5 relative">
                    <AvatarImage
                      src={user?.avatarUrl}
                      alt="Your Story"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/story:scale-110"
                    />
                  </div>
                </div>
              </div>

              {/* Plus Badge to add a story */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreateStoryOpen(true);
                }}
                aria-label="Add story"
                className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-rose-500 text-white shadow-lg shadow-purple-500/40 border-2 border-[#090c15] transition-transform duration-200 group-hover/story:scale-110 cursor-pointer"
              >
                <Plus className="h-3 w-3 stroke-[3]" />
              </button>
            </div>

            <span className="text-[12px] font-medium tracking-tight text-purple-300/90 group-hover/story:text-purple-200 text-center truncate max-w-[72px]">
              Your Story
            </span>
          </div>

          {/* Skeletons while loading */}
          {isLoading && (
            <div className="flex items-center gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse"
                >
                  <div className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full bg-white/10" />
                  <div className="w-12 h-2.5 bg-white/10 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {/* User Stories Items (Instagram Multi-stop Gradient Rings & Gap) */}
          {!isLoading &&
            otherGroups.map((group) => {
              // Find real group index in full groups array
              const originalIndex = groups.findIndex(
                (g) => g.author.id === group.author.id,
              );

              return (
                <button
                  type="button"
                  key={group.author.id}
                  onClick={() => setActiveGroupIndex(originalIndex)}
                  aria-label={`Open ${group.author.displayName}'s stories`}
                  className="flex flex-col items-center gap-1.5 shrink-0 group/story"
                >
                  <div className="relative">
                    {/* Instagram Multi-stop Gradient Ring */}
                    <div
                      className={`p-[2.5px] rounded-full transition-transform duration-200 group-hover/story:scale-105 group-active/story:scale-95 ${
                        !group.hasUnseen
                          ? "bg-white/20"
                          : "bg-gradient-to-tr from-[#f59e0b] via-[#ec4899] via-[#8b5cf6] to-[#06b6d4] shadow-[0_0_12px_rgba(236,72,153,0.3)] animate-pulse-subtle"
                      }`}
                    >
                      {/* Dark Gap between Ring and Photo */}
                      <div className="p-[2px] bg-[#090c15] rounded-full">
                        <div className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full overflow-hidden bg-white/5 relative">
                          <AvatarImage
                            src={group.author.avatarUrl}
                            alt={group.author.displayName}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/story:scale-110"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[12px] font-medium tracking-tight truncate max-w-[74px] text-center transition-colors ${
                      !group.hasUnseen
                        ? "text-muted-foreground group-hover/story:text-foreground"
                        : "text-foreground/95 font-semibold group-hover/story:text-purple-300"
                    }`}
                  >
                    {group.author.displayName.split(" ")[0]}
                  </span>
                </button>
              );
            })}
        </div>
        {error && (
          <div role="alert" className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 text-xs text-rose-200">
            <span>{error}</span>
            <button type="button" onClick={() => void fetchActiveStories()} className="min-h-11 px-2 font-bold">
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Full-Screen Instagram-style Story Viewer Modal */}
      {activeGroupIndex !== null && groups.length > 0 && (
        <StoryViewerModal
          storyGroups={groups}
          initialGroupIndex={activeGroupIndex}
          onClose={() => setActiveGroupIndex(null)}
          onStoryDeleted={handleStoryDeleted}
        />
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={handleStoryCreated}
      />
    </>
  );
};
