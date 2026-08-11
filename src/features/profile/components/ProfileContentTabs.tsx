"use client";

import React, { useState } from "react";
import { Grid, Image as ImageIcon, Film, Heart, Bookmark, Play } from "lucide-react";
import { Tabs, TabItem } from "@/shared/components/ui/Tabs";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { MediaViewerModal } from "@/features/feed/components/MediaViewerModal";
import { Post } from "@/types";

interface ProfileContentTabsProps {
  isOwnProfile?: boolean;
  userPosts: Post[];
  savedPosts?: Post[];
  likedPosts?: Post[];
}

import { useRouter } from "next/navigation";
import { useReels } from "@/shared/providers/ReelsProvider";

export const ProfileContentTabs: React.FC<ProfileContentTabsProps> = ({
  isOwnProfile,
  userPosts,
  savedPosts = [],
  likedPosts = [],
}) => {
  const router = useRouter();
  const { reels } = useReels();
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Tabs list: Saved tab is ONLY included if isOwnProfile is true!
  const tabs: TabItem[] = [
    { id: "posts", label: "Posts", icon: <Grid className="h-3.5 w-3.5" /> },
    { id: "media", label: "Media Grid", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { id: "reels", label: "Reels & Clips", icon: <Film className="h-3.5 w-3.5" /> },
    ...(isOwnProfile
      ? [
          { id: "likes", label: "Likes", icon: <Heart className="h-3.5 w-3.5" /> },
          { id: "saved", label: "Saved (Private)", icon: <Bookmark className="h-3.5 w-3.5" /> },
        ]
      : []),
  ];

  const mediaPosts = userPosts.filter((p) => p.mediaUrls && p.mediaUrls.length > 0);
  const authorUserId = userPosts[0]?.user.id;
  const userReels = authorUserId
    ? reels.filter((r) => r.author.id === authorUserId)
    : reels;

  return (
    <div className="space-y-6">
      {/* Category Tabs Switcher */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      {activeTab === "posts" ? (
        userPosts.length > 0 ? (
          <div className="space-y-4">
            {userPosts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-panel rounded-2xl border border-white/10">
            <p className="text-xs text-muted-foreground">No posts shared yet.</p>
          </div>
        )
      ) : activeTab === "media" ? (
        mediaPosts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mediaPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="rounded-2xl overflow-hidden glass-card border border-white/10 group aspect-square relative cursor-pointer hover:border-purple-500/50 transition-all shadow-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.mediaUrls?.[0]}
                  alt="Media"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="p-2 rounded-full glass-card text-white">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-panel rounded-2xl border border-white/10">
            <p className="text-xs text-muted-foreground">No media photos found.</p>
          </div>
        )
      ) : activeTab === "reels" ? (
        userReels.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {userReels.map((reel) => (
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
                  <div className="flex justify-end">
                    <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white">
                      <Play className="h-3.5 w-3.5 fill-white" />
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-white font-medium line-clamp-2 drop-shadow-md">
                      {reel.caption}
                    </p>
                    <p className="text-[10px] text-purple-300 font-semibold mt-1">
                      ▶ {reel.viewsCount} views
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-panel rounded-2xl border border-white/10">
            <p className="text-xs text-muted-foreground">No short video reels found for this creator.</p>
          </div>
        )
      ) : activeTab === "likes" && isOwnProfile ? (
        likedPosts.length > 0 ? (
          <div className="space-y-4">
            {likedPosts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-panel rounded-2xl border border-white/10">
            <p className="text-xs text-muted-foreground">No liked posts yet.</p>
          </div>
        )
      ) : activeTab === "saved" && isOwnProfile ? (
        savedPosts.length > 0 ? (
          <div className="space-y-4">
            {savedPosts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-panel rounded-2xl border border-white/10">
            <p className="text-xs text-muted-foreground">No saved bookmarks yet.</p>
          </div>
        )
      ) : null}

      {/* Media Viewer Modal when media item is clicked */}
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
