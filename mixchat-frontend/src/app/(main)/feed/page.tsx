"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Compass,
  Flame,
  Loader2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import { StoryTray } from "@/features/stories/components/StoryTray";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { FeedComposerWidget } from "@/features/feed/components/FeedComposerWidget";
import { CreatePostModal } from "@/features/feed/components/CreatePostModal";
import { CreateStoryModal } from "@/features/stories/components/CreateStoryModal";
import {
  postsService,
  mapDtoToPost,
  PostFeedItemDto,
} from "@/services/feed/postsService";
import { offlineStorage } from "@/services/storage/offlineStorage";
import { useAuth } from "@/shared/providers/AuthProvider";
import { Post } from "@/types";
import { Tabs, TabItem } from "@/shared/components/ui/Tabs";

const feedTabs: TabItem[] = [
  {
    id: "for_you",
    label: "For You",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    id: "following",
    label: "Following",
    icon: <Compass className="h-3.5 w-3.5" />,
  },
  {
    id: "trending",
    label: "Trending",
    icon: <Flame className="h-3.5 w-3.5 text-orange-400" />,
  },
];
const MAX_RENDERED_FEED_POSTS = 100;

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<
    "for_you" | "following" | "trending"
  >("for_you");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);

  // Pagination & Loading States
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  // Fetch initial page for selected tab
  const fetchInitialFeed = useCallback(
    async (tab: "for_you" | "following" | "trending") => {
      setIsLoadingInitial(true);
      setError(null);
      isFetchingRef.current = true;

      try {
        const response = await postsService.getFeed({
          tab,
          limit: 20,
        });

        const mappedPosts = response.items.map(mapDtoToPost);
        setPosts(mappedPosts);
        setNextCursor(response.pageInfo.nextCursor || null);
        setHasNextPage(response.pageInfo.hasNextPage);

        // Save safe offline feed snapshot for 'for_you' tab
        if (tab === "for_you" && response.items.length > 0) {
          offlineStorage.saveFeedSnapshot(user?.id || "guest", response.items);
        }
      } catch (err: unknown) {
        // Offline fallback: check if cached snapshot is available
        const cachedItems = offlineStorage.getFeedSnapshot<PostFeedItemDto>(
          user?.id || "guest",
        );
        if (cachedItems && cachedItems.length > 0) {
          const cachedPosts = cachedItems.map(mapDtoToPost);
          setPosts(cachedPosts);
          setError(null);
        } else {
          const message =
            (err as { message?: string })?.message || "Failed to load feed";
          setError(message);
        }
      } finally {
        setIsLoadingInitial(false);
        isFetchingRef.current = false;
      }
    },
    [user],
  );

  // Reconcile feed on network restoration
  useEffect(() => {
    const handleReconnected = () => {
      void fetchInitialFeed(activeTab);
    };

    window.addEventListener("mixchat:reconnected", handleReconnected);
    return () => {
      window.removeEventListener("mixchat:reconnected", handleReconnected);
    };
  }, [activeTab, fetchInitialFeed]);

  // Fetch more posts on infinite scroll
  const fetchMorePosts = useCallback(async () => {
    if (
      isFetchingRef.current ||
      isLoadingMore ||
      isLoadingInitial ||
      !hasNextPage ||
      !nextCursor
    ) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const response = await postsService.getFeed({
        tab: activeTab,
        cursor: nextCursor,
        limit: 20,
      });

      const newPosts = response.items.map(mapDtoToPost);

      // Defensively deduplicate by post ID
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const uniqueNew = newPosts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...uniqueNew].slice(
          0,
          MAX_RENDERED_FEED_POSTS,
        );
      });

      setNextCursor(response.pageInfo.nextCursor || null);
      setHasNextPage(
        response.pageInfo.hasNextPage &&
          posts.length + newPosts.length < MAX_RENDERED_FEED_POSTS,
      );
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message || "Failed to load more posts";
      setError(message);
    } finally {
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [
    activeTab,
    nextCursor,
    hasNextPage,
    isLoadingMore,
    isLoadingInitial,
    posts.length,
  ]);

  // Handle Tab Switch
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      await fetchInitialFeed(activeTab);
    };
    if (isMounted) {
      void load();
    }
    return () => {
      isMounted = false;
    };
  }, [activeTab, fetchInitialFeed]);

  // Setup IntersectionObserver on scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          void fetchMorePosts();
        }
      },
      {
        rootMargin: "300px", // Preload before reaching bottom
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [fetchMorePosts]);

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 select-none">

      {/* Top Stories Tray */}
      <div>
        <StoryTray />
      </div>

      {/* Modern High-End Post Creator Widget */}
      <div>
        <FeedComposerWidget
          onOpenCreatePost={() => setIsCreateModalOpen(true)}
          onOpenCreateStory={() => setIsCreateStoryOpen(true)}
        />
      </div>

      {/* Feed Filters Tabs */}
      <div>
        <Tabs
          tabs={feedTabs}
          activeTab={activeTab}
          fullWidth
          onChange={(tab) =>
            setActiveTab(tab as "for_you" | "following" | "trending")
          }
        />
      </div>

      {/* Error Banner */}
      {error && !isLoadingInitial && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => void fetchInitialFeed(activeTab)}
            className="flex min-h-11 items-center gap-1 px-2 font-bold text-white hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Initial Loading Skeletons */}
      {isLoadingInitial && (
        <div className="space-y-4" aria-label="Loading feed">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-3xl border border-white/10 bg-[#111728]/60 p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white/10" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-32 bg-white/10 rounded-full" />
                  <div className="h-2.5 w-20 bg-white/5 rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-white/10 rounded-full" />
                <div className="h-3 w-4/5 bg-white/10 rounded-full" />
              </div>
              <div className="h-48 w-full bg-white/5 rounded-2xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingInitial && posts.length === 0 && !error && (
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#111728]/60 to-[#070913]/80 p-10 text-center space-y-4 backdrop-blur-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              No posts in this feed yet
            </h3>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              {activeTab === "following"
                ? "Posts from accounts you follow will show up here. Follow some creators or post something!"
                : "Be the first to share an update, photo, or thought with the community!"}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 px-5 py-2.5 rounded-xl gradient-bg-primary text-white text-xs font-bold shadow-lg shadow-purple-500/25 hover:opacity-90 active:scale-95 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create First Post</span>
          </button>
        </div>
      )}

      {/* Post List */}
      {!isLoadingInitial && posts.length > 0 && (
        <div className="space-y-5">
            {posts.map((post) => (
              <div
                key={post.id}
                style={{ contentVisibility: "auto", containIntrinsicSize: "0 640px" }}
              >
                <FeedPostCard post={post} onPostDeleted={handlePostDeleted} />
              </div>
            ))}
        </div>
      )}

      {/* Infinite Scroll Loading Spinner / Sentinel */}
      <div
        ref={sentinelRef}
        className="py-4 flex items-center justify-center min-h-[40px]"
      >
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-xs text-purple-300">
            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            <span>Loading more posts...</span>
          </div>
        )}
        {!hasNextPage && posts.length > 0 && !isLoadingInitial && (
          <span className="text-[11px] text-white/30 font-medium">
            You&apos;ve reached the end of the feed.
          </span>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={() => setIsCreateStoryOpen(false)}
      />
    </div>
  );
}
