"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/providers/AuthProvider";
import { useChat } from "@/shared/providers/ChatProvider";
import { userService, UserDto } from "@/services/user/userService";
import { postsService, mapDtoToPost } from "@/services/feed/postsService";
import { ProfileHeroV2 } from "@/features/profile/components/ProfileHeroV2";
import { ProfileContentTabs } from "@/features/profile/components/ProfileContentTabs";
import { Loader2 } from "lucide-react";
import { Post } from "@/types";

export default function MyProfilePage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { startNewChat } = useChat();

  const [profile, setProfile] = useState<UserDto | null>(authUser);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(!authUser);

  useEffect(() => {
    let isMounted = true;
    const fetchProfileAndPosts = async () => {
      try {
        const [profileData, postsRes, savedRes] = await Promise.all([
          userService.getOwnProfile(),
          authUser
            ? postsService.getUserPosts(authUser.username, { limit: 50 })
            : Promise.resolve({ items: [] }),
          postsService.getBookmarkedPosts({ limit: 50 }),
        ]);

        if (isMounted) {
          setProfile(profileData);
          setUserPosts(postsRes.items.map(mapDtoToPost));
          setSavedPosts(savedRes.items.map(mapDtoToPost));
        }
      } catch (err) {
        console.error("Failed to load own profile data", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchProfileAndPosts();
    return () => {
      isMounted = false;
    };
  }, [authUser]);

  const handleStartChat = async (userId: string) => {
    await startNewChat(userId);
    router.push("/chat");
  };

  const handleShareProfile = async () => {
    if (profile && navigator.clipboard) {
      await navigator.clipboard.writeText(
        `${window.location.origin}/profile/${profile.username}`,
      );
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Profile Hero V2 Header */}
      <ProfileHeroV2
        isOwnProfile={true}
        user={profile}
        onStartChat={handleStartChat}
        onShareProfile={handleShareProfile}
      />

      {/* Profile Content Showcase Grid Tabs */}
      <ProfileContentTabs
        isOwnProfile={true}
        username={profile?.username}
        userPosts={userPosts}
        savedPosts={savedPosts}
        likedPosts={[]}
      />
    </div>
  );
}
