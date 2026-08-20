"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Compass,
  FileText,
  Flame,
  Hash,
  Heart,
  ImageIcon,
  LoaderCircle,
  MessageCircle,
  Play,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useChat } from "@/shared/providers/ChatProvider";
import { ExploreV2Grid } from "./ExploreV2Grid";
import {
  searchService,
  type PostFeedItemDto,
  type PublicProfileDto,
  type SearchMediaItemDto,
  type TrendingTagDto,
  type UniversalSearchResponseDto,
} from "@/services/search/searchService";

type SearchTab = "all" | "users" | "posts" | "tags" | "media";

const tabs: Array<{
  id: SearchTab;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  { id: "all", label: "Top", icon: Sparkles },
  { id: "users", label: "People", icon: Users },
  { id: "posts", label: "Posts", icon: FileText },
  { id: "tags", label: "Tags", icon: Hash },
  { id: "media", label: "Media", icon: ImageIcon },
];

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatCount = (value: number) => compactNumber.format(value);

interface SectionHeaderProps {
  title: string;
  count?: number;
  icon: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

function SectionHeader({
  title,
  count,
  icon,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/12 text-purple-300">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
          {count !== undefined && (
            <p className="text-xs font-medium text-white/45">
              {count} {count === 1 ? "result" : "results"}
            </p>
          )}
        </div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-3 text-sm font-semibold text-purple-300 transition-colors hover:bg-purple-500/10 hover:text-purple-200 active:bg-purple-500/15"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="flex min-h-24 animate-pulse items-center gap-3 rounded-2xl bg-white/[0.045] p-4"
          >
            <div className="h-12 w-12 rounded-full bg-white/8" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 rounded-full bg-white/8" />
              <div className="h-3 w-1/2 rounded-full bg-white/5" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="aspect-square animate-pulse rounded-2xl bg-white/[0.045]"
          />
        ))}
      </div>
    </div>
  );
}

interface PeopleResultsProps {
  users: PublicProfileDto[];
  limit?: number;
  chattingUserId: string | null;
  onStartChat: (userId: string) => void;
}

function PeopleResults({
  users,
  limit,
  chattingUserId,
  onStartChat,
}: PeopleResultsProps) {
  const visibleUsers = limit ? users.slice(0, limit) : users;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleUsers.map((user) => (
        <article
          key={user.id}
          className="group flex min-h-24 items-center gap-3 rounded-2xl bg-white/[0.045] p-3.5 transition-colors hover:bg-white/[0.07]"
        >
          <Link
            href={`/profile/${user.username}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <Avatar
              src={user.avatarUrl}
              alt={user.displayName || user.username}
              size="lg"
              isVerified={user.isVerified}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-bold text-white transition-colors group-hover:text-purple-200">
                  {user.displayName || user.username}
                </h3>
                {user.isVerified && (
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 fill-purple-400/15 text-purple-300"
                    aria-label="Verified account"
                  />
                )}
              </div>
              <p className="truncate text-sm text-white/50">@{user.username}</p>
              <p className="mt-1 truncate text-xs text-white/40">
                {formatCount(user.followersCount)} followers
                {user.locationCity ? ` · ${user.locationCity}` : ""}
              </p>
            </div>
          </Link>
          {user.relationshipState !== "SELF" && (
            <button
              type="button"
              onClick={() => onStartChat(user.id)}
              disabled={chattingUserId === user.id}
              aria-label={`Message ${user.displayName || user.username}`}
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-purple-500/12 text-purple-200 transition-colors hover:bg-purple-500/22 active:bg-purple-500/28 disabled:cursor-wait disabled:opacity-50"
            >
              {chattingUserId === user.id ? (
                <LoaderCircle className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4.5 w-4.5" aria-hidden="true" />
              )}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

interface TagResultsProps {
  tags: TrendingTagDto[];
  limit?: number;
  onSelect: (tag: string) => void;
}

function TagResults({ tags, limit, onSelect }: TagResultsProps) {
  const visibleTags = limit ? tags.slice(0, limit) : tags;

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {visibleTags.map((tag) => (
        <button
          type="button"
          key={tag.tag}
          onClick={() => onSelect(tag.tag)}
          className="group flex min-h-18 w-full cursor-pointer items-center gap-3 rounded-2xl bg-white/[0.045] p-3 text-left transition-colors hover:bg-white/[0.075] active:bg-white/[0.09]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/12 text-purple-200">
            <Hash className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-white group-hover:text-purple-200">
              {tag.tag}
            </span>
            <span className="mt-0.5 block truncate text-xs text-white/45">
              {formatCount(tag.postsCount)} posts · {tag.category}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-purple-300" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

interface MediaResultsProps {
  media: SearchMediaItemDto[];
  limit?: number;
}

function MediaResults({ media, limit }: MediaResultsProps) {
  const visibleMedia = limit ? media.slice(0, limit) : media;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
      {visibleMedia.map((item) => (
        <Link
          key={item.id}
          href={`/feed/${item.postId}`}
          aria-label="Open media post"
          className="group relative aspect-square overflow-hidden rounded-2xl bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          {item.kind === "VIDEO" ? (
            <video
              src={item.url}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt="Search result media"
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          )}
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-8 text-xs font-semibold text-white">
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" aria-hidden="true" />
              {formatCount(item.likesCount)}
            </span>
            {item.kind === "VIDEO" ? (
              <Play className="h-4 w-4 fill-white" aria-hidden="true" />
            ) : (
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}

interface PostResultsProps {
  posts: PostFeedItemDto[];
  limit?: number;
}

function PostResults({ posts, limit }: PostResultsProps) {
  const visiblePosts = limit ? posts.slice(0, limit) : posts;

  return (
    <div className="space-y-3">
      {visiblePosts.map((post) => {
        const firstMedia = post.media[0];
        return (
          <Link
            key={post.id}
            href={`/feed/${post.id}`}
            className="group block rounded-3xl bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:p-5"
          >
            <article className={firstMedia ? "grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]" : ""}>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <Avatar src={post.author.avatarUrl} alt={post.author.displayName} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-bold text-white group-hover:text-purple-200">
                        {post.author.displayName}
                      </h3>
                      {post.author.isVerified && (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-purple-300" aria-label="Verified account" />
                      )}
                    </div>
                    <p className="truncate text-xs text-white/40">@{post.author.username}</p>
                  </div>
                </div>
                {post.content && (
                  <p dir="auto" className="mt-3 line-clamp-3 text-[15px] leading-6 text-white/85 [overflow-wrap:anywhere]">
                    {post.content}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-white/40">
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4" aria-hidden="true" />
                    {formatCount(post.stats.likesCount)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {formatCount(post.stats.commentsCount)}
                  </span>
                  {post.locationTag && <span className="truncate">{post.locationTag}</span>}
                </div>
              </div>
              {firstMedia && (
                <div className="relative h-44 overflow-hidden rounded-2xl bg-black/25 sm:h-36">
                  {firstMedia.kind === "VIDEO" ? (
                    <video src={firstMedia.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstMedia.url} alt="Post media" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  {firstMedia.kind === "VIDEO" && (
                    <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md">
                      <Play className="h-3.5 w-3.5 fill-white" aria-hidden="true" />
                    </span>
                  )}
                </div>
              )}
            </article>
          </Link>
        );
      })}
    </div>
  );
}

interface EmptyResultsProps {
  query: string;
  suggestions: TrendingTagDto[];
  onSelect: (term: string) => void;
}

function EmptyResults({ query, suggestions, onSelect }: EmptyResultsProps) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl bg-white/[0.035] px-5 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/12 text-purple-300">
        <Search className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-bold text-white">No matches for “{query}”</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-white/50">
        Try a shorter keyword, check the spelling, or search with a username or hashtag.
      </p>
      {suggestions.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {suggestions.slice(0, 4).map((item) => (
            <button
              type="button"
              key={item.tag}
              onClick={() => onSelect(item.tag)}
              className="min-h-11 cursor-pointer rounded-full bg-white/[0.06] px-4 text-sm font-semibold text-white/70 transition-colors hover:bg-purple-500/15 hover:text-purple-200"
            >
              {item.tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const UniversalSearch: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { startNewChat } = useChat();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [searchResult, setSearchResult] = useState<UniversalSearchResponseDto | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [trendingTags, setTrendingTags] = useState<TrendingTagDto[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(true);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryReloadKey, setDiscoveryReloadKey] = useState(0);
  const [chattingUserId, setChattingUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadDiscovery = async () => {
      setIsDiscoveryLoading(true);
      setDiscoveryError(null);
      try {
        const [trendingResponse, recentItems] = await Promise.all([
          searchService.getTrending(),
          searchService.getRecentSearches().catch(() => []),
        ]);
        if (!isMounted) return;
        setTrendingTags(trendingResponse.items);
        setRecents(recentItems);
      } catch (error: unknown) {
        if (!isMounted) return;
        setDiscoveryError((error as { message?: string }).message || "Discovery is unavailable right now.");
      } finally {
        if (isMounted) setIsDiscoveryLoading(false);
      }
    };

    void loadDiscovery();
    return () => {
      isMounted = false;
    };
  }, [discoveryReloadKey]);

  const executeSearch = useCallback(async (value: string, tab: SearchTab) => {
    const trimmed = value.trim();
    if (!trimmed) {
      abortControllerRef.current?.abort();
      setSearchResult(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await searchService.searchUniversal(
        { q: trimmed, type: tab, limit: 24 },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setSearchResult(response);
    } catch (error: unknown) {
      if ((error as Error)?.name !== "AbortError" && !controller.signal.aborted) {
        setSearchError((error as { message?: string }).message || "Search could not be completed.");
      }
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void executeSearch(query, activeTab), 280);
    return () => window.clearTimeout(timer);
  }, [activeTab, executeSearch, query]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const selectSearchTerm = (term: string) => {
    setQuery(term);
    setActiveTab("all");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const clearQuery = () => {
    setQuery("");
    setActiveTab("all");
    setSearchResult(null);
    router.replace("/search", { scroll: false });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleRemoveRecent = async (term: string) => {
    setRecents((current) => current.filter((item) => item !== term));
    await searchService.deleteRecentSearch(term).catch(() => undefined);
  };

  const handleClearRecents = async () => {
    setRecents([]);
    await searchService.clearRecentSearches().catch(() => undefined);
  };

  const handleStartChat = async (userId: string) => {
    setChattingUserId(userId);
    try {
      await startNewChat(userId);
      router.push("/chat");
    } catch (error: unknown) {
      setSearchError((error as { message?: string }).message || "Could not start this conversation.");
    } finally {
      setChattingUserId(null);
    }
  };

  const users = searchResult?.users || [];
  const posts = searchResult?.posts || [];
  const tags = searchResult?.tags || [];
  const media = searchResult?.media || [];
  const totalResults = users.length + posts.length + tags.length + media.length;
  const hasQuery = query.trim().length > 0;
  const hasResults = totalResults > 0;
  const tabCounts = useMemo<Record<SearchTab, number>>(
    () => ({ all: totalResults, users: users.length, posts: posts.length, tags: tags.length, media: media.length }),
    [media.length, posts.length, tags.length, totalResults, users.length],
  );

  return (
    <div className="mx-auto w-full max-w-6xl pb-8 sm:pb-12">
      <header className="mb-5 sm:mb-7">
        <div className="flex items-center gap-3">
          <span className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 text-purple-200 sm:flex">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Search</h1>
            <p className="mt-1 text-sm text-white/50 sm:text-base">
              Find people, conversations, posts, and ideas across MixChat.
            </p>
          </div>
        </div>
      </header>

      <div className="sticky top-[calc(4rem+var(--sat))] z-20 -mx-1 mb-6 rounded-[1.7rem] bg-[#090c15]/92 p-1 backdrop-blur-2xl sm:top-[calc(4.25rem+var(--sat))] lg:top-16">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            void executeSearch(query, activeTab);
          }}
          className="relative"
        >
          <Search
            className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${isSearching ? "text-purple-300" : "text-white/40"}`}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people, posts, or #hashtags"
            aria-label="Search MixChat"
            aria-describedby="search-help"
            autoComplete="off"
            enterKeyHint="search"
            className="h-14 w-full rounded-[1.35rem] bg-[#121827] pl-12 pr-14 text-base font-medium text-white shadow-[0_14px_45px_rgba(0,0,0,0.25)] outline-none transition-colors placeholder:text-white/35 hover:bg-[#151c2d] focus:bg-[#171e30] focus:ring-2 focus:ring-purple-400/65"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/8 hover:text-white active:bg-white/12"
            >
              <X className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          )}
        </form>
        <p id="search-help" className="sr-only">Results update while you type.</p>

        {hasQuery && (
          <div className="no-scrollbar mt-2 flex overflow-x-auto pb-0.5" role="tablist" aria-label="Search categories">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  role="tab"
                  key={tab.id}
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors sm:flex-1 sm:justify-center ${
                    isActive ? "bg-white/[0.09] text-white" : "text-white/45 hover:bg-white/[0.045] hover:text-white/75"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden={true} />
                  <span>{tab.label}</span>
                  {searchResult && (
                    <span className={`text-xs tabular-nums ${isActive ? "text-purple-200" : "text-white/30"}`}>
                      {tabCounts[tab.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {searchError && hasQuery && (
        <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-100">
          <span>{searchError}</span>
          <button
            type="button"
            onClick={() => void executeSearch(query, activeTab)}
            className="min-h-11 shrink-0 cursor-pointer rounded-xl bg-rose-500/12 px-4 font-bold text-rose-100 hover:bg-rose-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {!hasQuery ? (
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
          <div className="order-2 min-w-0 lg:order-1">
            <ExploreV2Grid onStartChat={handleStartChat} />
          </div>

          <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-52" aria-label="Search suggestions">
            {recents.length > 0 && (
              <section className="rounded-3xl bg-white/[0.04] p-4">
                <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-bold text-white">
                    <Clock3 className="h-4.5 w-4.5 text-purple-300" aria-hidden="true" />
                    Recent
                  </h2>
                  <button
                    type="button"
                    onClick={() => void handleClearRecents()}
                    className="min-h-11 cursor-pointer rounded-xl px-2.5 text-sm font-semibold text-white/45 hover:bg-white/5 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {recents.slice(0, 6).map((term) => (
                    <div key={term} className="group flex min-h-12 items-center rounded-xl hover:bg-white/[0.045]">
                      <button
                        type="button"
                        onClick={() => selectSearchTerm(term)}
                        className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 px-2 text-left text-sm font-medium text-white/75"
                      >
                        <Search className="h-4 w-4 shrink-0 text-white/30" aria-hidden="true" />
                        <span className="truncate">{term}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemoveRecent(term)}
                        aria-label={`Remove ${term} from recent searches`}
                        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white/25 hover:bg-white/5 hover:text-white/70"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-3xl bg-white/[0.04] p-4">
              <div className="mb-2 flex min-h-11 items-center gap-2">
                <Flame className="h-4.5 w-4.5 text-orange-300" aria-hidden="true" />
                <h2 className="text-base font-bold text-white">Trending now</h2>
              </div>
              {isDiscoveryLoading ? (
                <div className="space-y-2" aria-label="Loading trending topics">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-14 animate-pulse rounded-xl bg-white/[0.045]" />
                  ))}
                </div>
              ) : trendingTags.length > 0 ? (
                <div className="space-y-1">
                  {trendingTags.slice(0, 8).map((topic, index) => (
                    <button
                      type="button"
                      key={topic.tag}
                      onClick={() => selectSearchTerm(topic.tag)}
                      className="group flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left hover:bg-white/[0.045]"
                    >
                      <span className="w-6 shrink-0 text-xs font-bold tabular-nums text-white/25">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white/80 group-hover:text-purple-200">{topic.tag}</span>
                        <span className="block truncate text-xs text-white/35">{formatCount(topic.postsCount)} posts</span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/20 group-hover:text-purple-300" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white/[0.035] p-4 text-sm leading-6 text-white/45">
                  <p>{discoveryError || "No trends are available yet."}</p>
                  {discoveryError && (
                    <button
                      type="button"
                      onClick={() => setDiscoveryReloadKey((value) => value + 1)}
                      className="mt-2 min-h-11 cursor-pointer font-bold text-purple-300 hover:text-purple-200"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}
            </section>
          </aside>
        </div>
      ) : (
        <div aria-live="polite" aria-busy={isSearching}>
          {isSearching && (
            <div className="mb-4 flex min-h-11 items-center gap-2 text-sm font-medium text-white/45" role="status">
              <LoaderCircle className="h-4.5 w-4.5 animate-spin text-purple-300" aria-hidden="true" />
              Searching for “{query.trim()}”
            </div>
          )}

          {!searchResult && isSearching ? (
            <SearchSkeleton />
          ) : !isSearching && !hasResults && !searchError ? (
            <EmptyResults query={query.trim()} suggestions={trendingTags} onSelect={selectSearchTerm} />
          ) : searchResult ? (
            <div className={`space-y-8 transition-opacity ${isSearching ? "opacity-55" : "opacity-100"}`}>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white/45">Search results</p>
                  <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">“{query.trim()}”</h2>
                </div>
                <p className="text-sm font-medium text-white/40">
                  {totalResults} {totalResults === 1 ? "match" : "matches"}
                </p>
              </div>

              {(activeTab === "all" || activeTab === "users") && users.length > 0 && (
                <section>
                  <SectionHeader
                    title="People"
                    count={users.length}
                    icon={<Users className="h-4.5 w-4.5" aria-hidden="true" />}
                    actionLabel={activeTab === "all" && users.length > 4 ? "See all" : undefined}
                    onAction={activeTab === "all" ? () => setActiveTab("users") : undefined}
                  />
                  <PeopleResults
                    users={users}
                    limit={activeTab === "all" ? 4 : undefined}
                    chattingUserId={chattingUserId}
                    onStartChat={(userId) => void handleStartChat(userId)}
                  />
                </section>
              )}

              {(activeTab === "all" || activeTab === "tags") && tags.length > 0 && (
                <section>
                  <SectionHeader
                    title="Topics"
                    count={tags.length}
                    icon={<Hash className="h-4.5 w-4.5" aria-hidden="true" />}
                    actionLabel={activeTab === "all" && tags.length > 6 ? "See all" : undefined}
                    onAction={activeTab === "all" ? () => setActiveTab("tags") : undefined}
                  />
                  <TagResults tags={tags} limit={activeTab === "all" ? 6 : undefined} onSelect={selectSearchTerm} />
                </section>
              )}

              {(activeTab === "all" || activeTab === "media") && media.length > 0 && (
                <section>
                  <SectionHeader
                    title="Media"
                    count={media.length}
                    icon={<ImageIcon className="h-4.5 w-4.5" aria-hidden="true" />}
                    actionLabel={activeTab === "all" && media.length > 8 ? "See all" : undefined}
                    onAction={activeTab === "all" ? () => setActiveTab("media") : undefined}
                  />
                  <MediaResults media={media} limit={activeTab === "all" ? 8 : undefined} />
                </section>
              )}

              {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
                <section>
                  <SectionHeader
                    title="Posts"
                    count={posts.length}
                    icon={<FileText className="h-4.5 w-4.5" aria-hidden="true" />}
                    actionLabel={activeTab === "all" && posts.length > 4 ? "See all" : undefined}
                    onAction={activeTab === "all" ? () => setActiveTab("posts") : undefined}
                  />
                  <PostResults posts={posts} limit={activeTab === "all" ? 4 : undefined} />
                </section>
              )}

              {!isSearching && !hasResults && (
                <EmptyResults query={query.trim()} suggestions={trendingTags} onSelect={selectSearchTerm} />
              )}

              {!isSearching && hasResults && tabCounts[activeTab] === 0 && activeTab !== "all" && (
                <EmptyResults query={query.trim()} suggestions={trendingTags} onSelect={selectSearchTerm} />
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
