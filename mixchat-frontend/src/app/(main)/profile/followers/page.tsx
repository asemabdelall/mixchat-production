"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/shared/providers/AuthProvider";
import {
  socialService,
  SocialUserItemDto,
} from "@/services/social/socialService";
import { SocialConnectionsList } from "@/features/profile/components/SocialConnectionsList";
import { Loader2 } from "lucide-react";

export default function FollowersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<SocialUserItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    socialService
      .getFollowers(user.id)
      .then((res) => {
        if (isMounted) {
          setUsers(res.items);
          setTotalCount(res.totalCount);
          setNextCursor(res.nextCursor || null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load followers", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLoadMore = async () => {
    if (!user || !nextCursor) return;
    try {
      const res = await socialService.getFollowers(user.id, nextCursor);
      setUsers((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor || null);
    } catch (err) {
      console.error("Failed to load more followers", err);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <SocialConnectionsList
      title="Followers"
      type="followers"
      targetUser={user}
      users={users}
      totalCount={totalCount}
      isOwnProfile={true}
      onLoadMore={handleLoadMore}
      hasMore={Boolean(nextCursor)}
    />
  );
}
