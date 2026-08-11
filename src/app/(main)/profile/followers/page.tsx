"use client";

import React from "react";
import { CURRENT_USER, MOCK_USERS } from "@/shared/services/mockData";
import { SocialConnectionsList } from "@/features/profile/components/SocialConnectionsList";

export default function FollowersPage() {
  const followers = MOCK_USERS.filter((u) => u.id !== CURRENT_USER.id);

  return (
    <SocialConnectionsList
      title="Followers"
      type="followers"
      targetUser={CURRENT_USER}
      users={followers}
      isOwnProfile={true}
    />
  );
}
