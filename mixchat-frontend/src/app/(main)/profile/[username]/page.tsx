"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock, ShieldAlert } from "lucide-react";
import { useAuth } from "@/shared/providers/AuthProvider";
import { useChat } from "@/shared/providers/ChatProvider";
import { userService, PublicProfileDto } from "@/services/user/userService";
import { socialService } from "@/services/social/socialService";
import { postsService, mapDtoToPost } from "@/services/feed/postsService";
import { ProfileHeroV2 } from "@/features/profile/components/ProfileHeroV2";
import { ProfileContentTabs } from "@/features/profile/components/ProfileContentTabs";
import { Card } from "@/shared/components/ui/Card";
import { Post } from "@/types";

export default function OtherUserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { startNewChat } = useChat();

  const [profile, setProfile] = useState<PublicProfileDto | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const usernameParam = params.username as string;

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        if (
          currentUser &&
          currentUser.username.toLowerCase() === usernameParam.toLowerCase()
        ) {
          router.replace("/profile");
          return;
        }

        const [profileData, postsData] = await Promise.all([
          userService.getPublicProfile(usernameParam),
          postsService
            .getUserPosts(usernameParam, { limit: 50 })
            .catch(() => ({ items: [] })),
        ]);

        if (!isMounted) return;
        setProfile(profileData);
        setUserPosts(postsData.items.map(mapDtoToPost));
        setIsLoading(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        const apiErr = err as { statusCode?: number; message?: string };
        if (apiErr?.statusCode === 404) {
          setError("User profile not found or is unavailable.");
        } else {
          setError(apiErr?.message || "Failed to load user profile.");
        }
        setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [usernameParam, currentUser, router]);

  const handleFollow = async () => {
    if (!profile) return;
    const previousState = profile.relationshipState;
    const previousCount = profile.followersCount;

    // Optimistic state update
    if (profile.isPrivate) {
      setProfile({ ...profile, relationshipState: "REQUESTED" });
    } else {
      setProfile({
        ...profile,
        relationshipState: "FOLLOWING",
        followersCount: previousCount + 1,
      });
    }

    try {
      const res = await socialService.followUser(profile.id);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              relationshipState: res.relationshipState,
              followersCount:
                res.relationshipState === "FOLLOWING" ||
                res.relationshipState === "MUTUAL"
                  ? previousCount + 1
                  : previousCount,
            }
          : null,
      );
    } catch {
      // Revert on error
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              relationshipState: previousState,
              followersCount: previousCount,
            }
          : null,
      );
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    const previousState = profile.relationshipState;
    const previousCount = profile.followersCount;

    // Optimistic update
    setProfile({
      ...profile,
      relationshipState: "NONE",
      followersCount: Math.max(
        0,
        previousCount -
          (previousState === "FOLLOWING" || previousState === "MUTUAL" ? 1 : 0),
      ),
    });

    try {
      const res = await socialService.unfollowUser(profile.id);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              relationshipState: res.relationshipState,
            }
          : null,
      );
    } catch {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              relationshipState: previousState,
              followersCount: previousCount,
            }
          : null,
      );
    }
  };

  const handleToggleCloseFriend = async () => {
    if (!profile) return;
    const nextState = !profile.isCloseFriend;
    setProfile({ ...profile, isCloseFriend: nextState });

    try {
      if (nextState) {
        await socialService.addCloseFriend(profile.id);
      } else {
        await socialService.removeCloseFriend(profile.id);
      }
    } catch {
      setProfile((prev) =>
        prev ? { ...prev, isCloseFriend: !nextState } : null,
      );
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    try {
      await socialService.blockUser(profile.id);
      router.push("/feed");
    } catch (err) {
      console.error("Failed to block user", err);
    }
  };

  const handleUnblock = async () => {
    if (!profile) return;
    try {
      await socialService.unblockUser(profile.id);
      setProfile({ ...profile, relationshipState: "NONE" });
    } catch (err) {
      console.error("Failed to unblock user", err);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pb-12 pt-6">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Feed</span>
        </Link>

        <Card className="glass-panel p-8 text-center border-white/10 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-purple-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-white">
            Profile Unavailable
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {error || "This user does not exist or has been removed."}
          </p>
        </Card>
      </div>
    );
  }

  const isFollowing =
    profile.relationshipState === "FOLLOWING" ||
    profile.relationshipState === "MUTUAL";
  const isPrivateAndNotFollowing = profile.isPrivate && !isFollowing;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Back Nav Row */}
      <div className="flex items-center justify-between mb-2">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Feed</span>
        </Link>
        <span className="text-xs font-semibold text-purple-300">
          @{profile.username}
        </span>
      </div>

      {/* Profile Hero Header */}
      <ProfileHeroV2
        isOwnProfile={false}
        user={profile}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onToggleCloseFriend={handleToggleCloseFriend}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        onStartChat={handleStartChat}
        onShareProfile={handleShareProfile}
      />

      {isPrivateAndNotFollowing ? (
        /* Private Account Wall */
        <Card className="glass-panel p-8 text-center border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-purple-400">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-white">
            This Account is Private
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Follow this account to see their posts, stories, and social
            activity.
          </p>
        </Card>
      ) : (
        <>
          {/* Profile Content Showcase Grid Tabs */}
          <ProfileContentTabs
            isOwnProfile={false}
            username={profile.username}
            userPosts={userPosts}
          />
        </>
      )}
    </div>
  );
}
