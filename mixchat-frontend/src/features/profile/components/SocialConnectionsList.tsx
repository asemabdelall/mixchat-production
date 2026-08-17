"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  UserCheck,
  UserPlus,
  UserMinus,
  Shield,
  Clock,
  Loader2,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import {
  socialService,
  SocialUserItemDto,
  RelationshipState,
} from "@/services/social/socialService";
import { useAuth } from "@/shared/providers/AuthProvider";

interface SocialConnectionsListProps {
  title: string;
  type: "followers" | "following";
  targetUser: { id: string; username: string; displayName?: string };
  users: SocialUserItemDto[];
  totalCount?: number;
  isOwnProfile?: boolean;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
}

export const SocialConnectionsList: React.FC<SocialConnectionsListProps> = ({
  title,
  type,
  targetUser,
  users: initialUsers,
  totalCount,
  isOwnProfile,
  onLoadMore,
  hasMore = false,
}) => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Record<string, { relationshipState?: RelationshipState; removed?: boolean }>
  >({});

  const users: SocialUserItemDto[] = initialUsers
    .filter((u) => !optimisticOverrides[u.id]?.removed)
    .map((u) => ({
      ...u,
      relationshipState:
        optimisticOverrides[u.id]?.relationshipState ?? u.relationshipState,
    }));

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleFollow = async (user: SocialUserItemDto) => {
    const isFollowing =
      user.relationshipState === "FOLLOWING" ||
      user.relationshipState === "MUTUAL";
    const previousState = user.relationshipState;

    const optimisticState: RelationshipState = isFollowing
      ? "NONE"
      : user.isPrivate
        ? "REQUESTED"
        : "FOLLOWING";

    setOptimisticOverrides((prev) => ({
      ...prev,
      [user.id]: { relationshipState: optimisticState },
    }));

    try {
      if (isFollowing || user.relationshipState === "REQUESTED") {
        const res = await socialService.unfollowUser(user.id);
        setOptimisticOverrides((prev) => ({
          ...prev,
          [user.id]: { relationshipState: res.relationshipState },
        }));
      } else {
        const res = await socialService.followUser(user.id);
        setOptimisticOverrides((prev) => ({
          ...prev,
          [user.id]: { relationshipState: res.relationshipState },
        }));
      }
    } catch {
      setOptimisticOverrides((prev) => ({
        ...prev,
        [user.id]: { relationshipState: previousState },
      }));
    }
  };

  const removeFollower = async (followerId: string) => {
    setOptimisticOverrides((prev) => ({
      ...prev,
      [followerId]: { removed: true },
    }));
    try {
      await socialService.removeFollower(followerId);
    } catch (err) {
      console.error("Failed to remove follower", err);
    }
  };

  const handleLoadMore = async () => {
    if (!onLoadMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between glass-panel p-4 rounded-3xl border border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="p-2 rounded-2xl glass-card text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{title}</span>
              <span className="text-xs text-purple-300 font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20">
                {totalCount !== undefined ? totalCount : users.length}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              @{targetUser.username}
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <Input
        icon={<Search className="h-4 w-4" />}
        placeholder={`Search ${type}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-11 text-xs"
      />

      {/* List Container */}
      <div className="space-y-3">
        {filteredUsers.length > 0 ? (
          <>
            {filteredUsers.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const isFollowing =
                u.relationshipState === "FOLLOWING" ||
                u.relationshipState === "MUTUAL";
              const isRequested = u.relationshipState === "REQUESTED";
              const isFollowBack = u.relationshipState === "FOLLOWED_BY";

              return (
                <Card
                  key={u.id}
                  className="glass-panel p-4 border-white/10 hover:border-purple-500/30 transition-all flex items-center justify-between"
                >
                  <Link
                    href={isSelf ? "/profile" : `/profile/${u.username}`}
                    className="flex items-center gap-3.5 flex-1 overflow-hidden group"
                  >
                    <Avatar
                      src={
                        u.avatarUrl ||
                        "/mixchat-icon.png"
                      }
                      alt={u.displayName}
                      size="md"
                      online={true}
                      isVerified={u.isVerified}
                    />
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors truncate">
                        {u.displayName || u.username}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        @{u.username}
                      </p>
                      {u.bio && (
                        <p className="text-[11px] text-purple-200/80 truncate mt-0.5">
                          {u.bio}
                        </p>
                      )}
                    </div>
                  </Link>

                  {!isSelf && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => toggleFollow(u)}
                        variant={
                          isFollowing || isRequested ? "glass" : "gradient"
                        }
                        size="sm"
                        className="h-9 px-3 text-xs gap-1.5"
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Following</span>
                          </>
                        ) : isRequested ? (
                          <>
                            <Clock className="h-3.5 w-3.5 text-purple-300" />
                            <span>Requested</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>
                              {isFollowBack ? "Follow Back" : "Follow"}
                            </span>
                          </>
                        )}
                      </Button>

                      {isOwnProfile && type === "followers" && (
                        <button
                          onClick={() => removeFollower(u.id)}
                          aria-label="Remove follower"
                          className="p-2 rounded-xl glass-card text-red-400 hover:bg-red-500/20 border border-white/10 transition-colors"
                          title="Remove follower"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            {hasMore && (
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                variant="glass"
                className="w-full h-11 text-xs font-semibold gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    <span>Loading more...</span>
                  </>
                ) : (
                  <span>Load More</span>
                )}
              </Button>
            )}
          </>
        ) : (
          <Card className="glass-panel p-12 text-center border-white/10 space-y-3">
            <Shield className="h-10 w-10 text-purple-400 mx-auto opacity-40" />
            <h3 className="text-base font-bold text-white">No {type} found</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {search
                ? `No accounts matching "${search}".`
                : `No ${type} to display yet.`}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
