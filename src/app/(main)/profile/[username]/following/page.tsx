"use client";

import React, { use } from "react";
import { MOCK_USERS } from "@/shared/services/mockData";
import { SocialConnectionsList } from "@/features/profile/components/SocialConnectionsList";

export default function UserFollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const user = MOCK_USERS.find((u) => u.username === resolvedParams.username) || MOCK_USERS[1];
  const following = MOCK_USERS.filter((u) => u.username !== user.username).map(u => ({ ...u, isFollowing: true }));

  return (
    <SocialConnectionsList
      title="Following"
      type="following"
      targetUser={user}
      users={following}
      isOwnProfile={false}
    />
  );
}
