"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Hash,
  X,
  Clock,
  Flame,
  ImageIcon,
  MessageSquare,
  Loader2,
  Users,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Tabs, TabItem } from "@/shared/components/ui/Tabs";
import { Card } from "@/shared/components/ui/Card";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { useChat } from "@/shared/providers/ChatProvider";
import { ExploreV2Grid } from "./ExploreV2Grid";
import { Post } from "@/types";
import {
  searchService,
  UniversalSearchResponseDto,
  TrendingTagDto,
  PostFeedItemDto,
} from "@/services/search/searchService";

const searchTabs: TabItem[] = [
  { id: "all", label: "Top" },
  { id: "users", label: "People" },
  { id: "posts", label: "Posts" },
  { id: "tags", label: "Tags" },
  { id: "media", label: "Media" },
];

export const UniversalSearch: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { startNewChat } = useChat();

  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<
    "all" | "users" | "posts" | "tags" | "media"
  >("all");

  // Search Results State
  const [searchResult, setSearchResult] =
    useState<UniversalSearchResponseDto | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Trending & Discovery State
  const [trendingTags, setTrendingTags] = useState<TrendingTagDto[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial trending topics and recent searches
  useEffect(() => {
    let isMounted = true;

    const loadDiscovery = async () => {
      try {
        setDiscoveryError(null);
        const [trendingRes, recentItems] = await Promise.all([
          searchService.getTrending(),
          searchService.getRecentSearches().catch(() => []),
        ]);
        if (isMounted) {
          setTrendingTags(trendingRes.items);
          setRecents(recentItems);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setDiscoveryError(
            (error as { message?: string }).message ||
              "Could not load trending topics.",
          );
        }
      }
    };

    void loadDiscovery();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced search query execution
  const executeSearch = useCallback(
    async (q: string, tab: "all" | "users" | "posts" | "tags" | "media") => {
      const trimmed = q.trim();
      if (!trimmed) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setSearchResult(null);
        setIsSearching(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);
      setSearchError(null);
      try {
        const res = await searchService.searchUniversal(
          {
            q: trimmed,
            type: tab,
            limit: 20,
          },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setSearchResult(res);
        }
      } catch (error: unknown) {
        if ((error as Error)?.name !== "AbortError") {
          setSearchError(
            (error as { message?: string }).message || "Search failed.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void executeSearch(query, activeTab);
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [query, activeTab, executeSearch]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSelectRecentOrTrending = (term: string) => {
    setQuery(term);
  };

  const handleRemoveRecent = async (term: string) => {
    setRecents((prev) => prev.filter((r) => r !== term));
    try {
      await searchService.deleteRecentSearch(term);
    } catch {
      // Non-fatal
    }
  };

  const handleClearAllRecents = async () => {
    setRecents([]);
    try {
      await searchService.clearRecentSearches();
    } catch {
      // Non-fatal
    }
  };

  const handleStartChat = async (userId: string) => {
    await startNewChat(userId);
    router.push("/chat");
  };

  const users = searchResult?.users || [];
  const posts = searchResult?.posts || [];
  const tags = searchResult?.tags || [];
  const media = searchResult?.media || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 select-none">
      {/* Search Header & Input Bar */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white gradient-text">
            Universal Search & Explore
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time algorithmic discovery across accounts, posts, trending
            hashtags, and visual media
          </p>
        </div>

        {/* Search Input Box */}
        <Input
          icon={<Search className="h-4 w-4 text-purple-400" />}
          placeholder="Search accounts, keywords, #hashtags..."
          aria-label="Search accounts, keywords, and hashtags"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rightElement={
            query ? (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search query"
                className="text-white/40 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            ) : isSearching ? (
              <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
            ) : null
          }
          className="h-12 text-sm rounded-2xl shadow-lg"
          autoFocus
        />

        {/* Category Tabs */}
        {query.trim().length > 0 && (
          <Tabs
            tabs={searchTabs}
            activeTab={activeTab}
            onChange={(tabId) =>
              setActiveTab(
                tabId as "all" | "users" | "posts" | "tags" | "media",
              )
            }
          />
        )}
      </div>

      {/* Main Search Content */}
      {searchError && query.trim() && (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-200">
          {searchError}
        </div>
      )}
      {!query.trim() ? (
        /* Empty Query State: Show Recents, Trending & Explore Hub */
        <div className="space-y-6">
          {/* Recent Searches Bar */}
          {recents.length > 0 && (
            <Card className="glass-panel p-4 sm:p-5 border-white/10 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-purple-400" />
                  <span>Recent Searches</span>
                </h3>
                <button
                  type="button"
                  onClick={handleClearAllRecents}
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recents.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border border-white/10 text-xs text-white hover:border-purple-500/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectRecentOrTrending(item)}
                      className="cursor-pointer font-medium hover:text-purple-300 transition-colors"
                    >
                      {item}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecent(item)}
                      aria-label={`Remove ${item}`}
                      className="text-muted-foreground hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Dynamic Real-time Trending Topics Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-400" />
              <span>Trending Topics & Hashtags</span>
            </h3>

            {trendingTags.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trendingTags.map((topic, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleSelectRecentOrTrending(topic.tag)}
                    className="glass-panel p-4 border-white/10 hover:border-purple-500/40 transition-all flex w-full items-center justify-between group shadow-md text-left"
                  >
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        {topic.category}
                      </span>
                      <h4 className="font-bold text-sm text-purple-300 group-hover:text-purple-200 mt-0.5">
                        {topic.tag}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                        {topic.postsCount}{" "}
                        {topic.postsCount === 1 ? "post" : "posts"}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                      <Hash className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="glass-panel p-6 text-center rounded-2xl border border-white/10 text-white/50">
                <span className="text-xs">
                  {discoveryError || "No trending topics yet."}
                </span>
              </div>
            )}
          </div>

          {/* Algorithmic Explore Discovery Feed */}
          <ExploreV2Grid onStartChat={handleStartChat} />
        </div>
      ) : (
        /* Query Active: Render Categorized Results */
        <div className="space-y-6">
          {isSearching && (
            <div className="flex items-center justify-center py-6 gap-2 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span className="text-xs">
                Searching database across {activeTab}...
              </span>
            </div>
          )}

          {/* 1. People Results */}
          {(activeTab === "all" || activeTab === "users") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-400" />
                  <span>People ({users.length})</span>
                </h3>
              </div>

              {users.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {users.map((u) => (
                    <Card
                      key={u.id}
                      className="glass-panel p-3.5 flex items-center justify-between border-white/10 gap-3 shadow-md"
                    >
                      <Link
                        href={`/profile/${u.username}`}
                        className="flex items-center gap-3 min-w-0 flex-1 group cursor-pointer"
                      >
                        <Avatar
                          src={u.avatarUrl || ""}
                          alt={u.displayName}
                          size="md"
                          isVerified={u.isVerified}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <h4 className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors truncate">
                              {u.displayName || u.username}
                            </h4>
                            {u.isVerified && (
                              <BadgeCheck className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            @{u.username}
                          </p>
                          {u.bio && (
                            <p className="text-[10px] text-purple-300/80 truncate mt-0.5">
                              &ldquo;{u.bio}&rdquo;
                            </p>
                          )}
                        </div>
                      </Link>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link href={`/profile/${u.username}`}>
                          <Button size="xs" variant="glass" className="text-xs">
                            Profile
                          </Button>
                        </Link>
                        <Button
                          onClick={() => handleStartChat(u.id)}
                          size="xs"
                          className="gradient-bg-primary text-white text-xs font-bold gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>Chat</span>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : !isSearching && activeTab === "users" ? (
                <div className="text-center py-8 glass-panel rounded-2xl border border-white/10 text-white/40 text-xs">
                  No people found matching &ldquo;{query}&rdquo;
                </div>
              ) : null}
            </div>
          )}

          {/* 2. Hashtags Results */}
          {(activeTab === "all" || activeTab === "tags") && tags.length > 0 && (
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-purple-400" />
                <span>Matching Hashtags ({tags.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tags.map((t, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setQuery(t.tag)}
                    className="glass-panel p-3.5 border-white/10 hover:border-purple-500/40 rounded-2xl transition-all flex w-full items-center justify-between group text-left"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-purple-300 group-hover:text-purple-200">
                        {t.tag}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t.postsCount} {t.postsCount === 1 ? "post" : "posts"} •{" "}
                        {t.category}
                      </p>
                    </div>
                    <span className="text-xs text-purple-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Explore →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Media Grid Results */}
          {(activeTab === "all" || activeTab === "media") &&
            media.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-purple-400" />
                  <span>Media Photos & Videos ({media.length})</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {media.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => router.push(`/feed/${item.postId}`)}
                      aria-label="Open post"
                      className="rounded-2xl overflow-hidden glass-card border border-white/10 group aspect-square relative hover:border-purple-500/50 transition-all shadow-lg"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt="Search Media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* 4. Posts Search Results */}
          {(activeTab === "all" || activeTab === "posts") && (
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-purple-400" />
                <span>Posts ({posts.length})</span>
              </h3>

              {posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((postItem: PostFeedItemDto) => {
                    const postModel: Post = {
                      id: postItem.id,
                      userId: postItem.author.id,
                      user: {
                        id: postItem.author.id,
                        username: postItem.author.username,
                        displayName: postItem.author.displayName,
                        avatar: postItem.author.avatarUrl || "",
                        online: false,
                        isPremium: postItem.author.isPremium,
                        followersCount: 0,
                        followingCount: 0,
                      },
                      content: postItem.content || "",
                      mediaUrls: (postItem.media || []).map((m) => m.url),
                      likesCount: postItem.stats.likesCount,
                      commentsCount: postItem.stats.commentsCount,
                      sharesCount: postItem.stats.repostsCount,
                      isLiked: postItem.viewer.hasLiked,
                      isBookmarked: postItem.viewer.hasBookmarked,
                      createdAt: postItem.createdAt,
                    };
                    return <FeedPostCard key={postItem.id} post={postModel} />;
                  })}
                </div>
              ) : !isSearching && activeTab === "posts" ? (
                <div className="text-center py-8 glass-panel rounded-2xl border border-white/10 text-white/40 text-xs">
                  No posts found matching &ldquo;{query}&rdquo;
                </div>
              ) : null}
            </div>
          )}

          {/* No Results Fallback Across All Domains */}
          {!isSearching &&
            users.length === 0 &&
            posts.length === 0 &&
            tags.length === 0 &&
            media.length === 0 && (
              <div className="text-center py-12 glass-panel rounded-3xl border border-white/10 text-white/40 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-purple-400">
                  <Search className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-sm text-white">
                  No results found
                </h4>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  We couldn&apos;t find anything matching &ldquo;{query}&rdquo;.
                  Try checking your spelling or search for another keyword.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
