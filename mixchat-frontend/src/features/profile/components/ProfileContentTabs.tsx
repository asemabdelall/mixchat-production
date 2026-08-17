"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Grid,
  List,
  Image as ImageIcon,
  Film,
  Heart,
  Bookmark,
  Play,
  MessageCircle,
  Layers,
  Loader2,
} from "lucide-react";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { MediaViewerModal } from "@/features/feed/components/MediaViewerModal";
import { Post } from "@/types";
import { reelsService, ReelItemDto } from "@/services/reels/reelsService";

interface ProfileContentTabsProps {
  isOwnProfile?: boolean;
  username?: string;
  userPosts: Post[];
  savedPosts?: Post[];
  likedPosts?: Post[];
}

export const ProfileContentTabs: React.FC<ProfileContentTabsProps> = ({
  isOwnProfile,
  username,
  userPosts,
  savedPosts = [],
  likedPosts = [],
}) => {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "posts" | "reels" | "media" | "likes" | "saved"
  >("posts");
  const [postViewMode, setPostViewMode] = useState<"grid" | "feed">("grid");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [userReels, setUserReels] = useState<ReelItemDto[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (!username || activeTab !== "reels") return;

    const fetchReels = async () => {
      try {
        const res = await reelsService.getUserReels(username);
        if (active) {
          setUserReels(res.items);
          setIsLoadingReels(false);
        }
      } catch (err) {
        console.error("Failed to load user reels", err);
        if (active) setIsLoadingReels(false);
      }
    };

    void fetchReels();

    return () => {
      active = false;
    };
  }, [username, activeTab]);

  const mediaPosts = userPosts.filter(
    (p) => p.mediaUrls && p.mediaUrls.length > 0,
  );

  // Tabs List
  const tabs = [
    { id: "posts", label: "Posts", count: userPosts.length, icon: Grid },
    { id: "reels", label: "Reels", count: userReels.length, icon: Film },
    { id: "media", label: "Media", count: mediaPosts.length, icon: ImageIcon },
    ...(isOwnProfile
      ? [
          {
            id: "likes",
            label: "Likes",
            count: likedPosts.length,
            icon: Heart,
          },
          {
            id: "saved",
            label: "Saved",
            count: savedPosts.length,
            icon: Bookmark,
          },
        ]
      : []),
  ] as const;

  return (
    <div className="space-y-5 select-none">
      {/* 1. Sleek Instagram-Style Profile Tabs Navigation */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95 ${
                  isActive
                    ? "text-white shadow-lg shadow-purple-500/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="profileTabPill"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 border border-purple-400/40"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon
                    className={`h-4 w-4 ${isActive ? "text-white" : "text-white/60"}`}
                  />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grid vs Feed View Mode Switcher (only for Posts tab) */}
        {activeTab === "posts" && userPosts.length > 0 && (
          <div className="hidden sm:flex items-center bg-[#090c17] p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setPostViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                postViewMode === "grid"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-white/50 hover:text-white"
              }`}
              title="Grid View"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPostViewMode("feed")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                postViewMode === "feed"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-white/50 hover:text-white"
              }`}
              title="Feed View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Tab Panels Content */}
      <AnimatePresence mode="wait">
        {/* Posts Tab */}
        {activeTab === "posts" && (
          <motion.div
            key="posts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {userPosts.length > 0 ? (
              postViewMode === "grid" ? (
                /* Instagram 3-Column Square Grid with Hover Overlay */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                  {userPosts.map((post) => {
                    const hasMedia =
                      post.mediaUrls && post.mediaUrls.length > 0;
                    const previewUrl = hasMedia ? post.mediaUrls![0] : null;

                    return (
                      <button
                        type="button"
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        aria-label="Open post"
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-[#090c17] border border-white/10 shadow-lg hover:border-purple-500/50 transition-all text-left"
                      >
                        {previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewUrl} alt="Post media preview" className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-purple-950 p-4 text-center text-xs leading-5 text-white/80">
                            {post.content || "Text post"}
                          </span>
                        )}

                        {/* Carousel / Video Type Badge */}
                        {post.mediaUrls && post.mediaUrls.length > 1 && (
                          <span className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white shadow-md">
                            <Layers className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {post.mediaType === "video" && (
                          <span className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white shadow-md">
                            <Play className="h-3.5 w-3.5 fill-white" />
                          </span>
                        )}

                        {/* Hover Overlay with Likes and Comments */}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-xs">
                          <span className="flex items-center gap-1.5 drop-shadow-md">
                            <Heart className="h-4 w-4 fill-white" />
                            {post.likesCount}
                          </span>
                          <span className="flex items-center gap-1.5 drop-shadow-md">
                            <MessageCircle className="h-4 w-4 fill-white" />
                            {post.commentsCount}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Full Feed Post Cards View */
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <FeedPostCard key={post.id} post={post} />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-14 glass-panel rounded-3xl border border-white/10">
                <Grid className="h-10 w-10 text-purple-400/50 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-white">No Posts Yet</h4>
                <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                  When posts are shared, they will appear here in your grid.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Reels Tab (9:16 Video Grid) */}
        {activeTab === "reels" && (
          <motion.div
            key="reels"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {isLoadingReels ? (
              <div className="text-center py-14 glass-panel rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                <p className="text-xs text-muted-foreground">
                  Loading reels...
                </p>
              </div>
            ) : userReels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                {userReels.map((reel) => (
                  <button
                    type="button"
                    key={reel.id}
                    onClick={() => router.push(`/reels?id=${reel.id}`)}
                    aria-label="Open reel"
                    className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-[#090c17] border border-white/10 shadow-lg hover:border-purple-500/50 transition-all text-left"
                  >
                    {reel.video.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reel.video.posterUrl}
                        alt={reel.caption || "Reel"}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                      />
                    ) : (
                      <video
                        src={reel.video.url}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300 pointer-events-none"
                      />
                    )}

                    {/* Gradient Overlay & Metadata */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20 p-3 flex flex-col justify-between">
                      <div className="flex justify-end">
                        <span className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white shadow-md">
                          <Play className="h-3 w-3 fill-white" />
                        </span>
                      </div>

                      <div>
                        {reel.caption && (
                          <p className="text-xs text-white font-semibold line-clamp-2 drop-shadow-md">
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
            ) : (
              <div className="text-center py-14 glass-panel rounded-3xl border border-white/10">
                <Film className="h-10 w-10 text-pink-400/50 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-white">No Reels Found</h4>
                <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                  Short clips and video moments will show up here.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Media Grid Tab */}
        {activeTab === "media" && (
          <motion.div
            key="media"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {mediaPosts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                {mediaPosts.map((post) => (
                  <button
                    type="button"
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    aria-label="Open media post"
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-[#090c17] border border-white/10 shadow-lg hover:border-purple-500/50 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.mediaUrls![0]}
                      alt="Media thumbnail"
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white">
                        <ImageIcon className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-14 glass-panel rounded-3xl border border-white/10">
                <ImageIcon className="h-10 w-10 text-cyan-400/50 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-white">
                  No Photos or Media
                </h4>
                <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                  Photos and video attachments will be collected here.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Likes Tab (Private / Own Profile Only) */}
        {activeTab === "likes" && isOwnProfile && (
          <motion.div
            key="likes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {likedPosts.length > 0 ? (
              <div className="space-y-4">
                {likedPosts.map((post) => (
                  <FeedPostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-14 glass-panel rounded-3xl border border-white/10">
                <Heart className="h-10 w-10 text-pink-400/50 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-white">No Liked Posts</h4>
                <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                  Posts you like will be organized here for quick access.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Saved Tab (Private Bookmarks / Own Profile Only) */}
        {activeTab === "saved" && isOwnProfile && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {savedPosts.length > 0 ? (
              <div className="space-y-4">
                {savedPosts.map((post) => (
                  <FeedPostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-14 glass-panel rounded-3xl border border-white/10">
                <Bookmark className="h-10 w-10 text-purple-400/50 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-white">No Saved Posts</h4>
                <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                  Only you can see the posts you bookmark.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Media Viewer Modal for Grid item clicks */}
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
