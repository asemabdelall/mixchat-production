"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  safetyService,
  BlockedUserItem,
} from "@/services/safety/safetyService";
import { BlockConfirmationModal } from "@/features/safety/components/BlockConfirmationModal";
import {
  ArrowLeft,
  UserX,
  Shield,
  Loader2,
  AlertCircle,
  Search,
  UserCheck,
} from "lucide-react";

export default function BlockedAccountsPage() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserToUnblock, setSelectedUserToUnblock] =
    useState<BlockedUserItem | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const res = await safetyService.getBlockedUsers(undefined, 50);
        if (mounted) {
          setBlockedUsers(res.items);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Failed to load blocked accounts";
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

  const filteredUsers = blockedUsers.filter(
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
            <UserX className="w-6 h-6 text-red-400" />
            <span>Blocked Accounts</span>
          </h1>
          <p className="text-xs text-white/50 mt-0.5">
            Blocked people cannot find your profile, view your posts, or send
            you messages.
          </p>
        </div>
      </div>

      {/* Search Input */}
      {blockedUsers.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] rounded-2xl text-sm font-medium text-white placeholder:text-white/35 focus:outline-none focus-visible:outline-none focus:border-red-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-red-500/15 transition-all duration-200"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-red-400" />
          <span className="text-sm">Loading blocked accounts...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-white/[0.01] border border-white/5 rounded-2xl p-6">
          <div className="inline-flex p-4 rounded-full bg-white/5 text-white/40">
            <Shield className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-white">
            No Blocked Accounts
          </h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {searchQuery
              ? "No blocked accounts match your search query."
              : "You haven’t blocked anyone yet. When you block someone, they will appear here."}
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
                <div className="relative w-11 h-11 rounded-full overflow-hidden bg-white/10 border border-white/10 flex-shrink-0">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.username}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60 font-semibold">
                      {user.displayName[0]?.toUpperCase() ||
                        user.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {user.displayName}
                  </h4>
                  <p className="text-xs text-white/40">@{user.username}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserToUnblock(user)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Unblock</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Unblock Modal */}
      {selectedUserToUnblock && (
        <BlockConfirmationModal
          isOpen={!!selectedUserToUnblock}
          onClose={() => setSelectedUserToUnblock(null)}
          targetUserId={selectedUserToUnblock.id}
          targetUsername={selectedUserToUnblock.username}
          isBlocked={true}
          onSuccess={() => {
            setBlockedUsers((prev) =>
              prev.filter((u) => u.id !== selectedUserToUnblock.id),
            );
          }}
        />
      )}
    </div>
  );
}
