"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, UserCheck, UserPlus, UserMinus, Shield } from "lucide-react";
import { User } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";

interface SocialConnectionsListProps {
  title: string;
  type: "followers" | "following";
  targetUser: User;
  users: User[];
  isOwnProfile?: boolean;
}

export const SocialConnectionsList: React.FC<SocialConnectionsListProps> = ({
  title,
  type,
  targetUser,
  users: initialUsers,
  isOwnProfile,
}) => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>(initialUsers);

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFollow = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, isFollowing: !u.isFollowing } : u
      )
    );
  };

  const removeFollower = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
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
                {users.length}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">@{targetUser.username}</p>
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
          filteredUsers.map((u) => {
            const isSelf = u.id === "u_me";
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
                    src={u.avatar}
                    alt={u.displayName}
                    size="md"
                    online={u.online}
                    isVerified={u.role === "verified"}
                  />
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors truncate">
                      {u.displayName}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                    {u.bio && (
                      <p className="text-[11px] text-purple-200/80 truncate mt-0.5">{u.bio}</p>
                    )}
                  </div>
                </Link>

                {!isSelf && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => toggleFollow(u.id)}
                      variant={u.isFollowing ? "glass" : "gradient"}
                      size="sm"
                      className="h-9 px-3 text-xs gap-1.5"
                    >
                      {u.isFollowing ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </Button>

                    {isOwnProfile && type === "followers" && (
                      <button
                        onClick={() => removeFollower(u.id)}
                        aria-label="Remove follower"
                        className="p-2 rounded-xl glass-card text-red-400 hover:bg-red-500/20 border border-white/10 transition-colors"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })
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
