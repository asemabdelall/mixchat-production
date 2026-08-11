"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Flame, Sparkles, Heart, MessageCircle, Play, Users, Eye, ArrowUpRight } from "lucide-react";
import { MOCK_POSTS, MOCK_USERS, MOCK_STORIES } from "@/shared/services/mockData";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { StoryViewerModal } from "@/features/stories/components/StoryViewerModal";
import { MediaViewerModal } from "@/features/feed/components/MediaViewerModal";
import { Post, User } from "@/types";

interface ExploreV2GridProps {
  onStartChat: (userId: string) => void;
}

import { useRouter } from "next/navigation";
import { useReels } from "@/shared/providers/ReelsProvider";

export const ExploreV2Grid: React.FC<ExploreV2GridProps> = ({ onStartChat }) => {
  const router = useRouter();
  const { reels } = useReels();
  const [selectedStoryMediaUrl, setSelectedStoryMediaUrl] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const mediaPosts = MOCK_POSTS.filter((p) => p.mediaUrls && p.mediaUrls.length > 0);
  const featuredCreators = MOCK_USERS.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Short Video Reels Discovery Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Play className="h-4 w-4 text-pink-400 fill-pink-400" />
            <span>Trending Short Reels</span>
          </h3>
          <Link href="/reels" className="text-xs text-purple-300 hover:underline font-semibold">
            Watch All Reels →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {reels.slice(0, 4).map((reel) => (
            <div
              key={reel.id}
              onClick={() => router.push(`/reels?id=${reel.id}`)}
              className="relative aspect-[9/16] rounded-2xl overflow-hidden glass-card border border-white/10 group cursor-pointer shadow-lg hover:border-purple-500/50 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reel.posterUrl}
                alt={reel.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  {reel.discoveryReason ? (
                    <span className="text-[9px] font-bold text-white bg-purple-600/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-purple-400/40 truncate max-w-[110px]">
                      {reel.discoveryReason}
                    </span>
                  ) : <span />}
                  <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white">
                    <Play className="h-3.5 w-3.5 fill-white" />
                  </span>
                </div>
                <div>
                  <p className="text-xs text-white font-medium line-clamp-2 drop-shadow-md">
                    {reel.caption}
                  </p>
                  <p className="text-[10px] text-purple-300 font-semibold mt-1">
                    ▶ {reel.viewsCount} views • @{reel.author.username}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured People & Creator Spotlight */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>Discover Creators & People</span>
          </h3>
          <Link href="/friends" className="text-xs text-purple-300 hover:underline font-semibold">
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
                  src={creator.avatar}
                  alt={creator.displayName}
                  size="md"
                  online={creator.online}
                  isVerified={creator.role === "verified"}
                />
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${creator.username}`} className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors block truncate">
                    {creator.displayName}
                  </Link>
                  <p className="text-[10px] text-muted-foreground truncate">@{creator.username}</p>
                </div>
              </div>

              {/* Discovery Context Tag */}
              <div className="glass-card px-2.5 py-1 rounded-xl border border-white/5 text-[10px] text-purple-300 font-medium flex items-center gap-1">
                <Users className="h-3 w-3 shrink-0" />
                <span className="truncate">2 mutual friends • Technology</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Link href={`/profile/${creator.username}`} className="flex-1">
                  <Button size="xs" variant="glass" className="w-full text-xs">
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

      {/* Visual Discovery Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-orange-400" />
          <span>Trending Posts & Media Grid</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mediaPosts.map((post, idx) => {
            const author = MOCK_USERS.find((u) => u.id === post.userId) || MOCK_USERS[0];
            const isLargeTile = idx === 0;

            return (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`rounded-2xl overflow-hidden glass-card border border-white/10 group cursor-pointer relative shadow-lg hover:border-purple-500/50 transition-all ${
                  isLargeTile ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : "aspect-square"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.mediaUrls?.[0]}
                  alt="Explore Media"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Overlay Content */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3.5 flex flex-col justify-between opacity-95 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                      <Avatar src={author.avatar} alt={author.displayName} size="sm" />
                      <span className="text-[10px] text-white font-bold truncate max-w-[90px]">
                        @{author.username}
                      </span>
                    </div>

                    <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-white font-medium line-clamp-2 drop-shadow-md">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-purple-300 font-semibold mt-1.5">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-pink-400 fill-pink-400" />
                        {post.likesCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3 text-purple-300" />
                        {post.commentsCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story Viewer Modal integration */}
      {selectedStoryMediaUrl && (
        <StoryViewerModal
          story={{
            id: "story_exp_1",
            userId: MOCK_USERS[1].id,
            user: MOCK_USERS[1],
            mediaUrl: selectedStoryMediaUrl,
            mediaType: "image",
            caption: "Live story from Explore discovery feed 🌟",
            timestamp: "10m ago",
            duration: 5,
            viewsCount: 310,
          }}
          onClose={() => setSelectedStoryMediaUrl(null)}
        />
      )}

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
