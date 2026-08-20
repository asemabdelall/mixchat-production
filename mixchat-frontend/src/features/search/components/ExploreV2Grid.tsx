"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  ImageIcon,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { MediaViewerModal } from "@/features/feed/components/MediaViewerModal";
import { Post } from "@/types";
import { reelsService, type ReelItemDto } from "@/services/reels/reelsService";
import {
  searchService,
  type PostFeedItemDto,
} from "@/services/search/searchService";
import { mapDtoToPost } from "@/services/feed/postsService";

interface ExploreV2GridProps {
  onStartChat: (userId: string) => void;
}

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function DiscoverySkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading discovery content">
      <div className="space-y-3">
        <div className="h-7 w-36 animate-pulse rounded-full bg-white/8" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="col-span-2 aspect-square animate-pulse rounded-3xl bg-white/[0.055]" />
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="aspect-square animate-pulse rounded-2xl bg-white/[0.045]"
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="aspect-[9/14] animate-pulse rounded-3xl bg-white/[0.045]"
          />
        ))}
      </div>
    </div>
  );
}

interface DiscoveryHeadingProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  actionLabel?: string;
}

function DiscoveryHeading({
  id,
  title,
  description,
  icon,
  href,
  actionLabel,
}: DiscoveryHeadingProps) {
  return (
    <div className="mb-4 flex min-h-12 items-end justify-between gap-4">
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 text-lg font-extrabold text-white sm:text-xl"
        >
          <span className="text-purple-300">{icon}</span>
          {title}
        </h2>
        <p className="mt-1 text-sm leading-5 text-white/45">{description}</p>
      </div>
      {href && actionLabel && (
        <Link
          href={href}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-bold text-purple-300 transition-colors hover:bg-purple-500/10 hover:text-purple-200 active:bg-purple-500/15"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export const ExploreV2Grid: React.FC<ExploreV2GridProps> = ({
  onStartChat,
}) => {
  const router = useRouter();
  const [trendingReels, setTrendingReels] = useState<ReelItemDto[]>([]);
  const [explorePosts, setExplorePosts] = useState<PostFeedItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDiscoveryData = async () => {
      try {
        const [feedResponse, reelsResponse] = await Promise.all([
          searchService.getExploreFeed({ limit: 12 }),
          reelsService
            .getFeed("foryou", undefined, 4)
            .catch(() => ({ items: [] })),
        ]);

        if (!isMounted) return;
        setExplorePosts(feedResponse.items);
        setTrendingReels(reelsResponse.items || []);
      } catch (requestError: unknown) {
        if (!isMounted) return;
        setError(
          (requestError as { message?: string }).message ||
            "Discovery could not be loaded right now.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchDiscoveryData();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const featuredCreators = useMemo(() => {
    const uniqueCreators = new Map<
      string,
      PostFeedItemDto["author"] & { postsInExplore: number }
    >();

    explorePosts.forEach((post) => {
      const current = uniqueCreators.get(post.author.id);
      uniqueCreators.set(post.author.id, {
        ...post.author,
        postsInExplore: (current?.postsInExplore || 0) + 1,
      });
    });

    return [...uniqueCreators.values()]
      .sort((first, second) => second.postsInExplore - first.postsInExplore)
      .slice(0, 3);
  }, [explorePosts]);

  const visualPosts = useMemo(
    () =>
      explorePosts.filter((post) => {
        const media = post.media[0];
        return media?.kind === "IMAGE" || media?.kind === "VIDEO";
      }),
    [explorePosts],
  );

  const retry = () => {
    setError(null);
    setIsLoading(true);
    setReloadKey((value) => value + 1);
  };

  if (isLoading) return <DiscoverySkeleton />;

  return (
    <div className="space-y-9 sm:space-y-11">
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-500/12 px-4 font-bold transition-colors hover:bg-rose-500/20"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {visualPosts.length > 0 && (
        <section aria-labelledby="visual-discovery-title">
          <DiscoveryHeading
            id="visual-discovery-title"
            title="Explore"
            description="Fresh photos and videos picked for you."
            icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {visualPosts.map((post, index) => {
              const media = post.media[0];
              if (!media) return null;
              const isFeature = index === 0;

              return (
                <button
                  type="button"
                  key={post.id}
                  onClick={() => setSelectedPost(mapDtoToPost(post))}
                  aria-label={`Open post by ${post.author.displayName}`}
                  className={`group relative cursor-pointer overflow-hidden bg-white/[0.045] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                    isFeature
                      ? "col-span-2 row-span-2 aspect-square rounded-3xl"
                      : "aspect-square rounded-2xl"
                  }`}
                >
                  {media.kind === "VIDEO" ? (
                    <video
                      src={media.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={media.url}
                      alt={post.content || `Post by ${post.author.displayName}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                    />
                  )}

                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/10" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 sm:p-4">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <Avatar
                          src={post.author.avatarUrl}
                          alt={post.author.displayName}
                          size="sm"
                        />
                        <span className="truncate text-sm font-bold text-white">
                          {post.author.displayName}
                        </span>
                      </span>
                      {isFeature && post.content && (
                        <span
                          dir="auto"
                          className="mt-2 line-clamp-2 block text-sm leading-5 text-white/75"
                        >
                          {post.content}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-white/80">
                      {media.kind === "VIDEO" ? (
                        <Play className="h-4 w-4 fill-white" aria-hidden="true" />
                      ) : (
                        <Heart className="h-4 w-4" aria-hidden="true" />
                      )}
                      {compactNumber.format(post.stats.likesCount)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {trendingReels.length > 0 && (
        <section aria-labelledby="reels-discovery-title">
          <DiscoveryHeading
            id="reels-discovery-title"
            title="Reels for you"
            description="Short videos people are watching now."
            icon={<Play className="h-5 w-5 fill-purple-300" aria-hidden="true" />}
            href="/reels"
            actionLabel="See all"
          />
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
            {trendingReels.map((reel) => (
              <button
                type="button"
                key={reel.id}
                onClick={() => router.push(`/reels?id=${reel.id}`)}
                aria-label={`Open reel by ${reel.author.displayName}`}
                className="group relative aspect-[9/14] w-[44vw] max-w-48 shrink-0 snap-start cursor-pointer overflow-hidden rounded-3xl bg-white/[0.045] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:w-auto sm:max-w-none"
              >
                {reel.video.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={reel.video.posterUrl}
                    alt={reel.caption || `Reel by ${reel.author.displayName}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                  />
                ) : (
                  <video
                    src={reel.video.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/15" />
                <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md">
                  <Play className="h-4 w-4 fill-white" aria-hidden="true" />
                </span>
                <span className="absolute inset-x-0 bottom-0 p-3.5">
                  <span className="line-clamp-2 text-sm font-bold leading-5 text-white">
                    {reel.caption || reel.author.displayName}
                  </span>
                  <span className="mt-1.5 block text-xs font-semibold text-white/55">
                    {compactNumber.format(reel.counts.viewsCount)} views
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {featuredCreators.length > 0 && (
        <section aria-labelledby="creator-discovery-title">
          <DiscoveryHeading
            id="creator-discovery-title"
            title="People to discover"
            description="Creators appearing in today’s explore feed."
            icon={<Users className="h-5 w-5" aria-hidden="true" />}
            href="/friends"
            actionLabel="Find people"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {featuredCreators.map((creator) => (
              <article
                key={creator.id}
                className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/[0.045] p-3.5 sm:block sm:p-4"
              >
                <Link
                  href={`/profile/${creator.username}`}
                  className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:block sm:text-center"
                >
                  <Avatar
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    size="lg"
                    isVerified={creator.isVerified}
                  />
                  <span className="min-w-0 sm:mt-3 sm:block">
                    <span className="flex items-center gap-1.5 sm:justify-center">
                      <span className="truncate text-sm font-bold text-white">
                        {creator.displayName}
                      </span>
                      {creator.isVerified && (
                        <BadgeCheck
                          className="h-4 w-4 shrink-0 text-purple-300"
                          aria-label="Verified account"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-white/40">
                      @{creator.username}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => onStartChat(creator.id)}
                  aria-label={`Message ${creator.displayName}`}
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-purple-500/14 text-purple-200 transition-colors hover:bg-purple-500/22 active:bg-purple-500/28 sm:mt-3 sm:w-full sm:rounded-xl"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span className="ml-2 hidden text-sm font-bold sm:inline">Message</span>
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {!error && explorePosts.length === 0 && trendingReels.length === 0 && (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl bg-white/[0.035] px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/12 text-purple-300">
            <ImageIcon className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-white">Nothing to explore yet</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/50">
            New photos, videos, and creators will appear here as the community shares.
          </p>
        </div>
      )}

      {selectedPost && (
        <MediaViewerModal
          isOpen
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
};
