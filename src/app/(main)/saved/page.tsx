"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bookmark, ArrowRight, RefreshCw } from "lucide-react";
import { MOCK_POSTS } from "@/shared/services/mockData";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

export default function SavedPostsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter posts that are currently bookmarked
  const savedPosts = MOCK_POSTS.filter((p) => p.isBookmarked);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div key={refreshKey} className="max-w-2xl mx-auto space-y-6 pb-12">
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
                {savedPosts.length}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">Private collection of saved moments</p>
          </div>
        </div>

        <Button onClick={handleRefresh} size="xs" variant="glass" className="gap-1 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Saved Posts Feed List */}
      <div className="space-y-4">
        {savedPosts.length > 0 ? (
          savedPosts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))
        ) : (
          <Card className="glass-panel p-12 text-center border-white/10 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full glass-card border border-white/10 text-purple-400 mx-auto">
              <Bookmark className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No saved posts yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Bookmark posts from your feed to view them later in your private saved collection.
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
    </div>
  );
}
