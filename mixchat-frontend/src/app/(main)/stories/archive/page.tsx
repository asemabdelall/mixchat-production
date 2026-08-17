"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Eye, Loader2 } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { StoryViewerModal } from "@/features/stories/components/StoryViewerModal";
import {
  storiesService,
  StoryItemDto,
  StoryGroupDto,
} from "@/services/stories/storiesService";

export default function StoryArchivePage() {
  const router = useRouter();
  const [archivedStories, setArchivedStories] = useState<StoryItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(
    null,
  );

  const fetchArchive = useCallback(async (cursor?: string) => {
    setError(null);
    try {
      if (!cursor) setIsLoading(true);
      else setIsLoadingMore(true);

      const res = await storiesService.getArchive({ cursor, limit: 24 });

      if (!cursor) {
        setArchivedStories(res.items);
      } else {
        setArchivedStories((prev) => [...prev, ...res.items]);
      }
      setNextCursor(res.pageInfo.nextCursor || null);
      setHasNextPage(res.pageInfo.hasNextPage);
    } catch {
      setError("Your story archive could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      await fetchArchive();
    };
    if (isMounted) {
      void load();
    }
    return () => {
      isMounted = false;
    };
  }, [fetchArchive]);

  // Convert flat archived stories to a group structure for StoryViewerModal
  const archiveGroup: StoryGroupDto | null =
    archivedStories.length > 0
      ? {
          author: archivedStories[0].author,
          stories: archivedStories,
          hasUnseen: false,
          latestStoryAt: archivedStories[0].createdAt,
        }
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between glass-panel p-4 rounded-3xl border border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl glass-card text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-400" />
              <span>Story Archive</span>
              <span className="text-xs text-purple-300 font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20">
                {archivedStories.length}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Only visible to you • Historical 24h story memories
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200">
          <span>{error}</span>
          <button type="button" onClick={() => void fetchArchive()} className="min-h-11 rounded-xl px-4 font-bold hover:bg-rose-500/15">
            Retry
          </button>
        </div>
      )}

      {/* Grid of Archived Stories */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-white/40">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          <span className="text-xs">Loading story archive...</span>
        </div>
      ) : archivedStories.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {archivedStories.map((story, idx) => (
              <button
                type="button"
                key={story.id}
                onClick={() => setSelectedStoryIndex(idx)}
                aria-label="Open archived story"
                className="relative aspect-[9/16] rounded-2xl overflow-hidden glass-card border border-white/10 group shadow-lg hover:border-purple-500/50 transition-all text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={story.media.url}
                  alt={story.caption || "Archived Story"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full w-fit">
                    {new Date(story.createdAt).toLocaleDateString()}
                  </span>

                  <div>
                    {story.caption && (
                      <p className="text-xs text-white font-medium line-clamp-2 mb-1 drop-shadow-md">
                        {story.caption}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-purple-300 font-semibold">
                      <Eye className="h-3 w-3" />
                      <span>{story.viewsCount || 0} views</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {hasNextPage && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => nextCursor && fetchArchive(nextCursor)}
                disabled={isLoadingMore}
                className="min-h-11 px-5 py-2.5 rounded-2xl glass-panel border border-white/10 text-xs font-bold text-purple-300 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoadingMore ? "Loading more..." : "Load more memories"}
              </button>
            </div>
          )}
        </>
      ) : (
        <Card className="glass-panel p-12 text-center border-white/10 space-y-4">
          <Clock className="h-10 w-10 text-purple-400 mx-auto opacity-40" />
          <h3 className="text-base font-bold text-white">
            No archived stories
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Stories you share will be archived here after 24 hours so you can
            revisit them anytime.
          </p>
        </Card>
      )}

      {/* Story Viewer Modal when clicked */}
      {selectedStoryIndex !== null && archiveGroup && (
        <StoryViewerModal
          storyGroups={[archiveGroup]}
          initialGroupIndex={0}
          initialStoryIndex={selectedStoryIndex}
          onClose={() => setSelectedStoryIndex(null)}
          onStoryDeleted={() => void fetchArchive()}
        />
      )}
    </div>
  );
}
