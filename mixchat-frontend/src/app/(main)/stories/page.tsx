"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Sparkles,
  Archive,
  Film,
  Video,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/shared/providers/AuthProvider";
import { StoryViewerModal } from "@/features/stories/components/StoryViewerModal";
import { CreateStoryModal } from "@/features/stories/components/CreateStoryModal";
import {
  storiesService,
  StoryGroupDto,
} from "@/services/stories/storiesService";

export default function StoriesPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroupDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unseen" | "videos">("all");
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    setError(null);
    try {
      const res = await storiesService.getActiveStories();
      setGroups(res.groups);
    } catch {
      setError("Stories could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      await fetchStories();
    };
    if (isMounted) {
      void load();
    }
    return () => {
      isMounted = false;
    };
  }, [fetchStories]);

  const handleStoryCreated = () => {
    void fetchStories();
  };

  const handleStoryDeleted = () => {
    void fetchStories();
  };

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    if (filter === "unseen") return g.hasUnseen;
    if (filter === "videos")
      return g.stories.some((s) => s.media.kind === "VIDEO");
    return true;
  });

  const ownGroup = groups.find((g) => g.author.id === user?.id);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 select-none">
      {/* Top Banner & Actions */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-purple-950/40 via-[#0c101d]/90 to-pink-950/40 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl">
        <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Stories & Moments
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full gradient-bg-primary text-white shadow-md">
                24h Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-white/60 max-w-md">
              Discover spontaneous moments, daily highlights, and video snippets
              from friends and creators.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/stories/archive"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-bold transition-all"
            >
              <Archive className="h-4 w-4" />
              <span>Archive</span>
            </Link>

            <button
              onClick={() => setIsCreateStoryOpen(true)}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-2xl gradient-bg-primary hover:opacity-90 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-purple-500/30 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Story</span>
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-5 border-t border-white/10 mt-5">
          <button
            onClick={() => setFilter("all")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold tracking-tight shrink-0 transition-all cursor-pointer active:scale-95 ${
              filter === "all"
                ? "gradient-bg-primary text-white shadow-md shadow-purple-500/20"
                : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>All Moments</span>
          </button>
          <button
            onClick={() => setFilter("unseen")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold tracking-tight shrink-0 transition-all cursor-pointer active:scale-95 ${
              filter === "unseen"
                ? "gradient-bg-primary text-white shadow-md shadow-purple-500/20"
                : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10"
            }`}
          >
            <span>Unseen Stories ✨</span>
          </button>
          <button
            onClick={() => setFilter("videos")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold tracking-tight shrink-0 transition-all cursor-pointer active:scale-95 ${
              filter === "videos"
                ? "gradient-bg-primary text-white shadow-md shadow-purple-500/20"
                : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10"
            }`}
          >
            <Film className="h-3.5 w-3.5 text-pink-400" />
            <span>Videos 🎬</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200">
          <span>{error}</span>
          <button type="button" onClick={() => void fetchStories()} className="min-h-11 rounded-xl px-4 font-bold hover:bg-rose-500/15">
            Retry
          </button>
        </div>
      )}

      {/* Visual 9:16 Story Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-white/40">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          <span className="text-xs">Loading active stories...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-5">
          {/* Your Story Creator Card */}
          <button
            type="button"
            onClick={() => {
              if (ownGroup) {
                const idx = groups.findIndex((g) => g.author.id === user?.id);
                setActiveGroupIndex(idx);
              } else {
                setIsCreateStoryOpen(true);
              }
            }}
            aria-label={ownGroup ? "Open your story" : "Create a story"}
            className="relative aspect-[9/16] rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-[#111728] to-[#070913] group shadow-xl flex flex-col justify-between p-3.5 transition-all duration-300 hover:border-purple-500/40 hover:scale-[1.02] active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                user?.avatarUrl ||
                "/mixchat-icon.png"
              }
              alt="Your Story"
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070913] via-black/40 to-transparent" />

            <div className="relative z-10 flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full">
                Your Story
              </span>
            </div>

            <div className="relative z-10 text-center flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-bg-primary text-white shadow-xl shadow-purple-500/40 mb-2 border-2 border-[#070913] group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6 stroke-[3]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white">
                {ownGroup ? "View Your Story" : "Create Story"}
              </span>
              <span className="text-[10px] text-white/50 mt-0.5">
                {ownGroup
                  ? `${ownGroup.stories.length} active`
                  : "Share your moment"}
              </span>
            </div>
          </button>

          {/* User Story Group Cards */}
          {filteredGroups.map((group) => {
            const originalIndex = groups.findIndex(
              (g) => g.author.id === group.author.id,
            );
            const latestStory = group.stories[group.stories.length - 1];

            return (
              <button
                type="button"
                key={group.author.id}
                onClick={() => setActiveGroupIndex(originalIndex)}
                aria-label={`Open ${group.author.displayName}'s stories`}
                className="relative aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 bg-black group shadow-xl flex flex-col justify-between p-3.5 transition-all duration-300 hover:border-purple-500/40 hover:scale-[1.02] active:scale-95 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={latestStory.media.url}
                  alt={group.author.displayName}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60" />

                {/* Author Chip (Top) */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate pr-1">
                    <div
                      className={`w-8 h-8 rounded-full p-[1.5px] ${
                        group.hasUnseen
                          ? "bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-500 shadow-md"
                          : "bg-white/20"
                      } shrink-0`}
                    >
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#070913]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                        src={
                          group.author.avatarUrl ||
                          "/mixchat-icon.png"
                        }
                          alt={group.author.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate drop-shadow-md">
                          {group.author.displayName.split(" ")[0]}
                        </span>
                        {group.author.isVerified && (
                          <BadgeCheck className="w-3 h-3 text-purple-400 fill-purple-400/20 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>

                  {latestStory.media.kind === "VIDEO" && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs backdrop-blur-md shrink-0">
                      <Video className="h-3 w-3" />
                    </span>
                  )}
                </div>

                {/* Story Caption & Time (Bottom) */}
                <div className="relative z-10">
                  {latestStory.caption && (
                    <p className="text-xs font-medium text-white/90 line-clamp-2 drop-shadow-md mb-1 leading-snug">
                      {latestStory.caption}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-white/60">
                    <span>
                      {new Date(latestStory.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-[10px] font-semibold text-purple-300">
                      {group.stories.length}{" "}
                      {group.stories.length === 1 ? "story" : "stories"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
