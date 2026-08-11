"use client";

import React from "react";
import { CURRENT_USER, MOCK_USERS } from "@/shared/services/mockData";
import { SocialConnectionsList } from "@/features/profile/components/SocialConnectionsList";

export default function FollowingPage() {
  const following = MOCK_USERS.filter((u) => u.id !== CURRENT_USER.id).map(u => ({ ...u, isFollowing: true }));

  return (
    <SocialConnectionsList
      title="Following"
      type="following"
      targetUser={CURRENT_USER}
      users={following}
      isOwnProfile={true}
    />
  );
}
