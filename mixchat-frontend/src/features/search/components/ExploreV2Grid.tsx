"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Sparkles,
  Heart,
  MessageCircle,
  Play,
  Users,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { MediaViewerModal } from "@/features/feed/components/MediaViewerModal";
import { Post } from "@/types";
import { reelsService, ReelItemDto } from "@/services/reels/reelsService";
import {
  searchService,
  PostFeedItemDto,
} from "@/services/search/searchService";
import { userService, SocialUserItemDto } from "@/services/user/userService";
import { mapDtoToPost } from "@/services/feed/postsService";

interface ExploreV2GridProps {
  onStartChat: (userId: string) => void;
  onTagClick?: (tag: string) => void;
}

export const ExploreV2Grid: React.FC<ExploreV2GridProps> = ({
  onStartChat,
}) => {
  const router = useRouter();
  const [trendingReels, setTrendingReels] = useState<ReelItemDto[]>([]);
  const [explorePosts, setExplorePosts] = useState<PostFeedItemDto[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<SocialUserItemDto[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDiscoveryData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [feedRes, creators, reelsRes] = await Promise.all([
          searchService.getExploreFeed({ limit: 12 }),
          userService.searchUsers("", 3),
          reelsService
            .getFeed("foryou", undefined, 4)
            .catch(() => ({ items: [] })),
        ]);
        if (isMounted) {
          setExplorePosts(feedRes.items);
          setFeaturedCreators(creators);
          setTrendingReels(reelsRes.items || []);
        }
      } catch {
        if (isMounted) {
          setError("Explore could not be loaded. Please try again.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchDiscoveryData();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const handleOpenPost = (postItem: PostFeedItemDto) => {
    setSelectedPost(mapDtoToPost(postItem));
  };

  return (
    <div className="space-y-6 select-none">
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
            Retry
          </Button>
        </div>
      )}
      {/* Short Video Reels Discovery Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Play className="h-4 w-4 text-pink-400 fill-pink-400" />
            <span>Trending Short Reels</span>
          </h3>
          <Link
            href="/reels"
            className="text-xs text-purple-300 hover:underline font-semibold"
          >
            Watch All Reels →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {trendingReels.map((reel) => (
            <button
              type="button"
              key={reel.id}
              onClick={() => router.push(`/reels?id=${reel.id}`)}
              aria-label="Open reel"
              className="relative aspect-[9/16] rounded-2xl overflow-hidden glass-card border border-white/10 group shadow-lg hover:border-purple-500/50 transition-all text-left"
            >
              {reel.video.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reel.video.posterUrl}
                  alt={reel.caption || "Reel"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <video
                  src={reel.video.url}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white">
                    <Play className="h-3.5 w-3.5 fill-white" />
                  </span>
                </div>
                <div>
                  {reel.caption && (
                    <p className="text-xs text-white font-medium line-clamp-2 drop-shadow-md">
                      {reel.caption}
                    </p>
                  )}
                  <p className="text-[10px] text-purple-300 font-bold mt-1">
                    ▶ {reel.counts.viewsCount.toLocaleString()} views
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Featured People & Creator Spotlight */}
      {featuredCreators.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Discover Creators & People</span>
            </h3>
            <Link
              href="/friends"
              className="text-xs text-purple-300 hover:underline font-semibold"
            >
              See All
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {featuredCreators.map((creator) => (
              <Card
                key={creator.id}
                className="glass-panel p-4 border-white/10 hover:border-purple-500/40 transition-all space-y-3 group"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={creator.avatarUrl || ""}
                    alt={creator.displayName}
                    size="md"
                    isVerified={creator.isVerified}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${creator.username}`}
                      className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors block truncate"
                    >
                      {creator.displayName}
                    </Link>
                    <p className="text-[10px] text-muted-foreground truncate">
                      @{creator.username}
                    </p>
                  </div>
                </div>

                {creator.bio && (
                  <div className="glass-card px-2.5 py-1 rounded-xl border border-white/5 text-[10px] text-purple-300 font-medium flex items-center gap-1">
                    <Users className="h-3 w-3 shrink-0" />
                    <span className="truncate">{creator.bio}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/profile/${creator.username}`}
                    className="flex-1"
                  >
                    <Button
                      size="xs"
                      variant="glass"
                      className="w-full text-xs"
                    >
                      Profile
                    </Button>
                  </Link>
                  <Button
                    onClick={() => onStartChat(creator.id)}
                    size="xs"
                    className="flex-1 gradient-bg-primary text-white text-xs font-bold"
                  >
                    Message
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Visual Discovery Grid from Real Backend Posts */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-orange-400" />
          <span>Trending Posts & Media Grid</span>
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-white/40">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            <span className="text-xs">Curating visual explore feed...</span>
          </div>
        ) : explorePosts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {explorePosts.map((post, idx) => {
              const isLargeTile = idx === 0;
              const mediaUrl = post.media?.[0]?.url;
              if (!mediaUrl) return null;

              return (
                <button
                  type="button"
                  key={post.id}
                  onClick={() => handleOpenPost(post)}
                  aria-label="Open post"
                  className={`rounded-2xl overflow-hidden glass-card border border-white/10 group cursor-pointer relative shadow-lg hover:border-purple-500/50 transition-all ${
                    isLargeTile
                      ? "col-span-2 row-span-2 aspect-square sm:aspect-auto"
                      : "aspect-square"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl}
                    alt={post.content || "Explore Media"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Overlay Content */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3.5 flex flex-col justify-between opacity-95 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                        <Avatar
                          src={post.author.avatarUrl || ""}
                          alt={post.author.displayName}
                          size="sm"
                        />
                        <span className="text-[10px] text-white font-bold truncate max-w-[90px]">
                          @{post.author.username}
                        </span>
                      </div>

                      <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <div>
                      {post.content && (
                        <p className="text-xs text-white font-medium line-clamp-2 drop-shadow-md">
                          {post.content}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-purple-300 font-semibold mt-1.5">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3 text-pink-400 fill-pink-400" />
                          {post.stats.likesCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3 text-purple-300" />
                          {post.stats.commentsCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 rounded-2xl glass-panel border border-white/10 text-white/40 space-y-1">
            <p className="text-xs font-semibold text-white/60">
              No explore media yet
            </p>
            <p className="text-[11px]">
              Be the first to publish a photo or video post to the community!
            </p>
          </div>
        )}
      </div>

      {/* Media Viewer Modal integration */}
      {selectedPost && (
        <MediaViewerModal
          isOpen={!!selectedPost}
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
};
