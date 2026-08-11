"use client";

import React, { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hash, ArrowLeft, Flame, TrendingUp, Sparkles } from "lucide-react";
import { MOCK_POSTS, MOCK_HASHTAGS } from "@/shared/services/mockData";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

export default function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const rawTag = decodeURIComponent(resolvedParams.tag).replace(/^#/, "");

  const hashtagInfo = MOCK_HASHTAGS.find(
    (h) => h.tag.toLowerCase() === rawTag.toLowerCase()
  ) || { tag: rawTag, postsCount: 1420, isTrending: true, category: "Trending Topic" };

  // Filter posts matching hashtag in content
  const matchingPosts = MOCK_POSTS.filter((p) =>
    p.content.toLowerCase().includes(`#${rawTag.toLowerCase()}`) ||
    p.content.toLowerCase().includes(rawTag.toLowerCase())
  );

  const postsToDisplay = matchingPosts.length > 0 ? matchingPosts : MOCK_POSTS;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="p-2 rounded-2xl glass-card text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {hashtagInfo.isTrending && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
              <Flame className="h-3.5 w-3.5 fill-pink-400" />
              <span>Trending #1</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-bg-primary text-white shadow-xl">
            <Hash className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">#{hashtagInfo.tag}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hashtagInfo.postsCount.toLocaleString()} posts • {hashtagInfo.category || "Social topic"}
            </p>
          </div>
        </div>

        {/* Related Hashtags Bar */}
        <div className="pt-2 border-t border-white/10 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-widest shrink-0">Related:</span>
          {MOCK_HASHTAGS.filter((h) => h.tag.toLowerCase() !== rawTag.toLowerCase()).slice(0, 4).map((h) => (
            <Link
              key={h.tag}
              href={`/hashtag/${h.tag}`}
              className="rounded-xl px-2.5 py-1 text-xs glass-card text-muted-foreground hover:text-white hover:border-purple-500/40 transition-all shrink-0"
            >
              #{h.tag}
            </Link>
          ))}
        </div>
      </div>

      {/* Posts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Recent Posts in #{hashtagInfo.tag}
          </h3>
        </div>

        {postsToDisplay.map((post) => (
          <FeedPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
