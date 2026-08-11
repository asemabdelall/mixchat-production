"use client";

import React, { use } from "react";
import { MOCK_USERS } from "@/shared/services/mockData";
import { SocialConnectionsList } from "@/features/profile/components/SocialConnectionsList";

export default function UserFollowersPage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const user = MOCK_USERS.find((u) => u.username === resolvedParams.username) || MOCK_USERS[1];
  const followers = MOCK_USERS.filter((u) => u.username !== user.username);

  return (
    <SocialConnectionsList
      title="Followers"
      type="followers"
      targetUser={user}
      users={followers}
      isOwnProfile={false}
    />
  );
}
