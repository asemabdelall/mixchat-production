"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { CURRENT_USER, MOCK_POSTS } from "@/shared/services/mockData";
import { useChat } from "@/shared/providers/ChatProvider";
import { useCall } from "@/shared/providers/CallProvider";
import { StoryViewerModal } from "@/features/stories/components/StoryViewerModal";
import { ProfileHeroV2 } from "@/features/profile/components/ProfileHeroV2";
import { ProfileContentTabs } from "@/features/profile/components/ProfileContentTabs";
import { StoryHighlightsTray } from "@/features/stories/components/StoryHighlightsTray";

export default function MyProfilePage() {
  const router = useRouter();
  const { startNewChat } = useChat();
  const { startCall } = useCall();

  const [selectedStoryMediaUrl, setSelectedStoryMediaUrl] = useState<string | null>(null);

  const myPosts = MOCK_POSTS.filter((p) => p.userId === CURRENT_USER.id || p.userId === "u_1");
  const savedPosts = MOCK_POSTS.filter((p) => p.isBookmarked);
  const likedPosts = MOCK_POSTS.filter((p) => p.isLiked);

  const handleStartChat = (userId: string) => {
    const chatId = startNewChat(userId);
    if (chatId) router.push("/chat");
  };

  const handleStartCall = (user: User) => {
    startCall(user, "voice");
  };

  const handleShareProfile = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`https://mixchat.app/${CURRENT_USER.username}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Profile Hero V2 Header */}
      <ProfileHeroV2
        isOwnProfile={true}
        user={CURRENT_USER}
        isFollowing={false}
        onToggleFollow={() => {}}
        friendStatus="none"
        onToggleFriendStatus={() => {}}
        onStartChat={handleStartChat}
        onStartCall={handleStartCall}
        onShareProfile={handleShareProfile}
        hasStory={true}
        storyMediaUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80"
        onOpenStory={(url) => setSelectedStoryMediaUrl(url)}
      />

      {/* Story Highlights Tray */}
      <div className="glass-panel p-4 rounded-3xl border border-white/10">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
          Story Highlights
        </h3>
        <StoryHighlightsTray isOwnProfile={true} />
      </div>

      {/* Profile Content Showcase Grid Tabs */}
      <ProfileContentTabs
        isOwnProfile={true}
        userPosts={myPosts}
        savedPosts={savedPosts}
        likedPosts={likedPosts}
      />

      {/* Story Viewer Modal integration */}
      {selectedStoryMediaUrl && (
        <StoryViewerModal
          story={{
            id: "story_my_1",
            userId: CURRENT_USER.id,
            user: CURRENT_USER,
            mediaUrl: selectedStoryMediaUrl,
            mediaType: "image",
            caption: "My active story highlight 📸",
            timestamp: "Just now",
            duration: 5,
            viewsCount: 230,
          }}
          onClose={() => setSelectedStoryMediaUrl(null)}
        />
      )}
    </div>
  );
}
