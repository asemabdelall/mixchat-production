"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  ArrowLeft,
  Flame,
  Plus,
  Share2,
  TrendingUp,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Check,
} from "lucide-react";
import { searchService, TrendingTagDto } from "@/services/search/searchService";
import { mapDtoToPost } from "@/services/feed/postsService";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { CreatePostModal } from "@/features/feed/components/CreatePostModal";
import { Post } from "@/types";

export default function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const rawTag = decodeURIComponent(resolvedParams.tag)
    .replace(/^#/, "")
    .trim();

  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTagDto[]>([]);
  const [activeTab, setActiveTab] = useState<"top" | "latest" | "media">("top");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!rawTag) return;
    let mounted = true;

    const loadData = async () => {
      try {
        const [searchRes, trendingRes] = await Promise.all([
          searchService.searchUniversal({
            q: `#${rawTag}`,
            type: "posts",
            limit: 30,
          }),
          searchService
            .getTrending()
            .catch(() => ({ items: [] as TrendingTagDto[], updatedAt: "" })),
        ]);

        if (mounted) {
          const rawPosts = Array.isArray(searchRes.posts)
            ? searchRes.posts
            : [];
          const mappedPosts = rawPosts.map(mapDtoToPost);
          setPosts(mappedPosts);
          setTrendingTags(trendingRes.items || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Failed to load hashtag posts";
          setError(message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, [rawTag, reloadKey]);

  // Find if this tag is trending in the database
  const trendingMatch = trendingTags.find(
    (t) => t.tag.toLowerCase().replace(/^#/, "") === rawTag.toLowerCase(),
  );

  const trendingRank = trendingMatch
    ? trendingTags.findIndex(
        (t) => t.tag.toLowerCase().replace(/^#/, "") === rawTag.toLowerCase(),
      ) + 1
    : null;

  // Other related trending hashtags
  const relatedTags = trendingTags
    .filter(
      (t) => t.tag.toLowerCase().replace(/^#/, "") !== rawTag.toLowerCase(),
    )
    .slice(0, 6);

  // Filter and sort posts based on active tab
  const displayedPosts = posts
    .filter((p) => {
      if (activeTab === "media") {
        return Boolean(
          (p.mediaUrls && p.mediaUrls.length > 0) ||
          (p.mediaItems && p.mediaItems.length > 0) ||
          p.videoUrl,
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (activeTab === "top") {
        return (
          b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount)
        );
      }
      // latest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `#${rawTag} on MixChat`,
          text: `Check out #${rawTag} on MixChat!`,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 px-3 sm:px-0">
      {/* Top Header Glass Card */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-white/10 space-y-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-gradient-to-br from-purple-600/20 via-pink-600/10 to-transparent blur-3xl pointer-events-none" />

        {/* Navigation & Actions */}
        <div className="flex items-center justify-between relative z-10">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="p-2.5 rounded-2xl glass-card text-white hover:bg-white/15 active:scale-95 transition-all border border-white/10 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {trendingRank && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 backdrop-blur-md animate-pulse">
                <Flame className="h-3.5 w-3.5 fill-pink-400" />
                <span>Trending #{trendingRank}</span>
              </span>
            )}

            <button
              onClick={handleShare}
              className="p-2.5 rounded-2xl glass-card text-white/80 hover:text-white hover:bg-white/15 active:scale-95 transition-all border border-white/10 shadow-sm flex items-center gap-1.5 text-xs font-medium"
              title="Share hashtag"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400 hidden sm:inline">
                    Copied
                  </span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hashtag Info */}
        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white shadow-xl ring-2 ring-white/20 shrink-0">
            <Hash className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
              #{rawTag}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-white/90">
                {trendingMatch?.postsCount
                  ? `${trendingMatch.postsCount.toLocaleString()} posts`
                  : `${posts.length} posts`}
              </span>
              <span>•</span>
              <span className="text-purple-300 font-medium">
                {trendingMatch?.category || "Social Tag"}
              </span>
              {trendingMatch?.velocityScore !== undefined && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <TrendingUp className="h-3 w-3" />+
                    {Math.round(trendingMatch.velocityScore)} velocity
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Create CTA Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Post to #{rawTag}</span>
          </button>
        </div>

        {/* Related Tags Stream */}
        {relatedTags.length > 0 && (
          <div className="pt-3 border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar relative z-10">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Related:
            </span>
            {relatedTags.map((h) => {
              const cleanTag = h.tag.replace(/^#/, "");
              return (
                <Link
                  key={h.tag}
                  href={`/hashtag/${encodeURIComponent(cleanTag)}`}
                  className="rounded-xl px-3 py-1 text-xs glass-card text-white/70 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 transition-all shrink-0 font-medium border border-white/5"
                >
                  #{cleanTag}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 p-1.5 glass-panel rounded-2xl border border-white/10">
        <button
          onClick={() => setActiveTab("top")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "top"
              ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          <span>Top</span>
        </button>

        <button
          onClick={() => setActiveTab("latest")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "latest"
              ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Latest</span>
        </button>

        <button
          onClick={() => setActiveTab("media")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "media"
              ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Media</span>
        </button>
      </div>

      {/* Content Stream */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="space-y-2 flex-1">
                  <div className="w-28 h-3.5 bg-white/10 rounded" />
                  <div className="w-16 h-2.5 bg-white/5 rounded" />
                </div>
              </div>
              <div className="w-full h-16 bg-white/5 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-panel p-8 rounded-3xl border border-red-500/20 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <h3 className="text-base font-bold text-white">
            Failed to load posts
          </h3>
          <p className="text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : displayedPosts.length === 0 ? (
        <div className="glass-panel p-10 rounded-3xl border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
            <Hash className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-white">
              No posts in #{rawTag} yet
            </h3>
            <p className="text-xs text-muted-foreground">
              Be the very first creator to start the conversation and publish a
              post tagged with #{rawTag}!
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg shadow-purple-900/30 hover:scale-[1.02] active:scale-95 transition-all inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Post with #{rawTag}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {displayedPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <FeedPostCard post={post} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Floating Mobile Create Post Button */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="sm:hidden fixed bottom-20 right-4 z-40 p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-900/50 active:scale-95 transition-transform"
        aria-label={`Post to #${rawTag}`}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create Post Modal prefilled with hashtag */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
        initialContent={`#${rawTag} `}
      />
    </div>
  );
}
