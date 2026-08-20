"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AvatarImage } from "@/shared/components/ui/AvatarImage";
import {
  socialService,
  SocialUserItemDto,
} from "@/services/social/socialService";
import {
  ArrowLeft,
  Star,
  Loader2,
  AlertCircle,
  Search,
  UserMinus,
} from "lucide-react";

export default function CloseFriendsSettingsPage() {
  const [closeFriends, setCloseFriends] = useState<SocialUserItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const res = await socialService.getCloseFriends(undefined, 50);
        if (mounted) {
          setCloseFriends(res.items);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Failed to load close friends";
          setError(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRemove = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      await socialService.removeCloseFriend(userId);
      setCloseFriends((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      // Handle error
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = closeFriends.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/settings/privacy"
          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2.5">
            <Star className="w-6 h-6 text-emerald-400 fill-emerald-400" />
            <span>Close Friends</span>
          </h1>
          <p className="text-xs text-white/50 mt-0.5">
            We don’t send notifications when you edit your Close Friends list.
          </p>
        </div>
      </div>

      {/* Search Input */}
      {closeFriends.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search close friends..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] rounded-2xl text-sm font-medium text-white placeholder:text-white/35 focus:outline-none focus-visible:outline-none focus:border-emerald-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/15 transition-all duration-200"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-sm">Loading close friends...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-white/[0.01] border border-white/5 rounded-2xl p-6">
          <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400">
            <Star className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-white">
            No Close Friends Yet
          </h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {searchQuery
              ? "No friends match your search query."
              : "Add people to your Close Friends list to share private stories and posts visible only to them."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 bg-[#121217] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center space-x-3.5">
                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-white/10 border border-emerald-500/40 flex-shrink-0">
                  <AvatarImage
                    src={user.avatarUrl}
                    alt={user.username}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="text-sm font-semibold text-white">
                      {user.displayName}
                    </h4>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-xs text-white/40">@{user.username}</p>
                </div>
              </div>

              <button
                onClick={() => handleRemove(user.id)}
                disabled={actionLoadingId === user.id}
                className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                {actionLoadingId === user.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserMinus className="w-3.5 h-3.5" />
                )}
                <span>Remove</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
