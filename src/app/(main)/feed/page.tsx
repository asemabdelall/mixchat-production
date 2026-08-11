"use client";

import React, { useState } from "react";
import { Plus, Sparkles, Compass, Flame, Image as ImageIcon, Video as VideoIcon, Film } from "lucide-react";
import { StoryTray } from "@/features/stories/components/StoryTray";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { CreatePostModal } from "@/features/feed/components/CreatePostModal";
import { CreateStoryModal } from "@/features/stories/components/CreateStoryModal";
import { MOCK_POSTS, CURRENT_USER } from "@/shared/services/mockData";
import { Post } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Tabs, TabItem } from "@/shared/components/ui/Tabs";

const feedTabs: TabItem[] = [
  { id: "for_you", label: "For You", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: "following", label: "Following", icon: <Compass className="h-3.5 w-3.5" /> },
  { id: "trending", label: "Trending", icon: <Flame className="h-3.5 w-3.5 text-orange-400" /> },
];

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [activeTab, setActiveTab] = useState("for_you");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);

  const handlePostCreated = (newPost: Post) => {
    setPosts([newPost, ...posts]);
  };

  // Filter posts based on active tab
  const getFilteredPosts = () => {
    if (activeTab === "following") {
      return posts.filter((p) => p.userId === "u_1" || p.userId === "u_3" || p.userId === "u_me");
    }
    if (activeTab === "trending") {
      return [...posts].sort((a, b) => b.likesCount - a.likesCount);
    }
    return posts;
  };

  const displayedPosts = getFilteredPosts();

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 select-none">
      {/* Top Stories Tray */}
      <StoryTray />

      {/* Quick Composer Widget V3 */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3 shadow-lg">
        <div className="flex items-center gap-3">
          <Avatar src={CURRENT_USER.avatar} alt={CURRENT_USER.displayName} size="md" />
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-left text-xs text-muted-foreground hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer"
          >
            <span>What&apos;s happening on Mix Chat?</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </button>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/5 text-purple-300 hover:text-white transition-colors cursor-pointer"
            >
              <ImageIcon className="h-4 w-4 text-purple-400" />
              <span className="font-medium text-[11px]">Photo</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/5 text-blue-300 hover:text-white transition-colors cursor-pointer"
            >
              <VideoIcon className="h-4 w-4 text-blue-400" />
              <span className="font-medium text-[11px]">Video</span>
            </button>

            <button
              onClick={() => setIsCreateStoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/5 text-pink-300 hover:text-white transition-colors cursor-pointer"
            >
              <Film className="h-4 w-4 text-pink-400" />
              <span className="font-medium text-[11px]">Story</span>
            </button>
          </div>

          <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="hidden sm:flex shrink-0 gap-1.5 font-bold">
            <Plus className="h-4 w-4" />
            <span>Post</span>
          </Button>
        </div>
      </div>

      {/* Feed Filters Tabs */}
      <div>
        <Tabs tabs={feedTabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Post List */}
      <div className="space-y-5">
        {displayedPosts.map((post) => (
          <FeedPostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={() => setIsCreateStoryOpen(false)}
      />
    </div>
  );
}
