"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { User } from "@/types";
import { MOCK_USERS, MOCK_POSTS, MOCK_STORIES } from "@/shared/services/mockData";
import { useChat } from "@/shared/providers/ChatProvider";
import { useCall } from "@/shared/providers/CallProvider";
import { StoryViewerModal } from "@/features/stories/components/StoryViewerModal";
import { ProfileHeroV2 } from "@/features/profile/components/ProfileHeroV2";
import { ProfileContentTabs } from "@/features/profile/components/ProfileContentTabs";
import { StoryHighlightsTray } from "@/features/stories/components/StoryHighlightsTray";

export default function OtherUserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { startNewChat } = useChat();
  const { startCall } = useCall();

  const [isFollowing, setIsFollowing] = useState(false);
  const [friendStatus, setFriendStatus] = useState<"none" | "requested" | "friends">("none");
  const [selectedStoryMediaUrl, setSelectedStoryMediaUrl] = useState<string | null>(null);

  const usernameParam = params.username as string;
  const targetUser =
    MOCK_USERS.find((u) => u.username === usernameParam || u.id === usernameParam) || MOCK_USERS[1];
  const userPosts = MOCK_POSTS.filter((p) => p.userId === targetUser.id);
  const mutualFriends = MOCK_USERS.filter((u) => u.id !== targetUser.id && u.id !== "u_me").slice(0, 3);

  // DYNAMIC DM ROUTING FIX! Call startNewChat(targetUser.id) instead of hardcoding chat_1!
  const handleStartChat = (userId: string) => {
    const chatId = startNewChat(userId);
    if (chatId) {
      router.push("/chat");
    }
  };

  const handleStartCall = (user: User) => {
    startCall(user, "voice");
  };

  const handleShareProfile = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`https://mixchat.app/${targetUser.username}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Back Nav Row */}
      <div className="flex items-center justify-between mb-2">
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white font-medium">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Feed</span>
        </Link>
        <span className="text-xs font-semibold text-purple-300">@{targetUser.username}</span>
      </div>

      {/* Profile Hero V2 Header */}
      <ProfileHeroV2
        isOwnProfile={false}
        user={targetUser}
        isFollowing={isFollowing}
        onToggleFollow={() => setIsFollowing((prev) => !prev)}
        friendStatus={friendStatus}
        onToggleFriendStatus={() => {
          setFriendStatus((prev) => (prev === "none" ? "requested" : prev === "requested" ? "none" : "friends"));
        }}
        onStartChat={handleStartChat}
        onStartCall={handleStartCall}
        onShareProfile={handleShareProfile}
        hasStory={true}
        storyMediaUrl={MOCK_STORIES[0]?.mediaUrl}
        onOpenStory={(url) => setSelectedStoryMediaUrl(url)}
        mutualFriends={mutualFriends}
      />

      {/* Story Highlights Tray */}
      <div className="glass-panel p-4 rounded-3xl border border-white/10">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
          Highlights
        </h3>
        <StoryHighlightsTray isOwnProfile={false} />
      </div>

      {/* Profile Content Showcase Grid Tabs (Saved tab strictly hidden for other profiles) */}
      <ProfileContentTabs
        isOwnProfile={false}
        userPosts={userPosts}
      />

      {/* Story Viewer Modal integration */}
      {selectedStoryMediaUrl && (
        <StoryViewerModal
          story={{
            id: "story_other_1",
            userId: targetUser.id,
            user: targetUser,
            mediaUrl: selectedStoryMediaUrl,
            mediaType: "image",
            caption: `Active story from @${targetUser.username} 📸`,
            timestamp: "20m ago",
            duration: 5,
            viewsCount: 180,
          }}
          onClose={() => setSelectedStoryMediaUrl(null)}
        />
      )}
    </div>
  );
}
