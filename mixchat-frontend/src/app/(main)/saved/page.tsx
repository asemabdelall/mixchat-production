"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bookmark,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { postsService, mapDtoToPost } from "@/services/feed/postsService";
import { Post } from "@/types";

export default function SavedPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await postsService.getBookmarkedPosts({ limit: 50 });
      setPosts(response.items.map(mapDtoToPost));
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to load saved posts";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await postsService.getBookmarkedPosts({ limit: 50 });
        if (isMounted) {
          setPosts(response.items.map(mapDtoToPost));
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            (err as { message?: string })?.message ||
            "Failed to load saved posts";
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePostDeleted = (deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg-primary text-white shadow-md">
            <Bookmark className="h-5 w-5 fill-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Saved Posts & Bookmarks</span>
              <span className="text-xs text-purple-300 font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20">
                {posts.length}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Private collection of saved moments
            </p>
          </div>
        </div>

        <Button
          onClick={() => void fetchSavedPosts()}
          size="xs"
          variant="glass"
          className="gap-1 text-xs cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
          <span className="text-xs text-white/50">Loading saved posts...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => void fetchSavedPosts()}
            className="font-bold text-white hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Saved Posts Feed List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {posts.length > 0 ? (
            posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                onPostDeleted={handlePostDeleted}
              />
            ))
          ) : (
            <Card className="glass-panel p-12 text-center border-white/10 space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full glass-card border border-white/10 text-purple-400 mx-auto">
                <Bookmark className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-white">
                No saved posts yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Bookmark posts from your feed to view them later in your private
                saved collection.
              </p>
              <Link href="/feed" className="inline-block pt-2">
                <Button size="default" className="gap-2 font-bold">
                  <span>Explore Feed</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
