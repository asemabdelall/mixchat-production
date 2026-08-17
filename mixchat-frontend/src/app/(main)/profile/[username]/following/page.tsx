"use client";

import React, { use, useEffect, useState } from "react";
import { userService, PublicProfileDto } from "@/services/user/userService";
import {
  socialService,
  SocialUserItemDto,
} from "@/services/social/socialService";
import { SocialConnectionsList } from "@/features/profile/components/SocialConnectionsList";
import { Loader2 } from "lucide-react";

export default function UserFollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const [profile, setProfile] = useState<PublicProfileDto | null>(null);
  const [users, setUsers] = useState<SocialUserItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const publicProfile = await userService.getPublicProfile(
          resolvedParams.username,
        );
        if (!isMounted) return;
        setProfile(publicProfile);
        const res = await socialService.getFollowing(publicProfile.id);
        if (!isMounted) return;
        setUsers(res.items);
        setTotalCount(res.totalCount);
        setNextCursor(res.nextCursor || null);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load target following", err);
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [resolvedParams.username]);

  const handleLoadMore = async () => {
    if (!profile || !nextCursor) return;
    try {
      const res = await socialService.getFollowing(profile.id, nextCursor);
      setUsers((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor || null);
    } catch (err) {
      console.error("Failed to load more following", err);
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
    <SocialConnectionsList
      title="Following"
      type="following"
      targetUser={profile}
      users={users}
      totalCount={totalCount}
      isOwnProfile={false}
      onLoadMore={handleLoadMore}
      hasMore={Boolean(nextCursor)}
    />
  );
}
