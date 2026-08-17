"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  QrCode,
  Share2,
  Loader2,
  BadgeCheck,
  UserCheck,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { Tabs, TabItem } from "@/shared/components/ui/Tabs";
import { useAuth } from "@/shared/providers/AuthProvider";
import { useChat } from "@/shared/providers/ChatProvider";
import {
  socialService,
  SocialUserItemDto,
  FollowRequestItemDto,
} from "@/services/social/socialService";
import { userService } from "@/services/user/userService";

export default function FriendsPage() {
  const { user } = useAuth();
  const { startNewChat } = useChat();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("all");

  // Tab 1: Connections / Following
  const [connections, setConnections] = useState<SocialUserItemDto[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Tab 2: Follow Requests
  const [requests, setRequests] = useState<FollowRequestItemDto[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null,
  );

  // Tab 3: Discover / Add by Username
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialUserItemDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState(false);

  // Load Connections
  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingConnections(true);
    try {
      const res = await socialService.getFollowing(user.id, undefined, 50);
      setConnections(res.items);
    } catch (err) {
      console.error("Failed to fetch connections", err);
    } finally {
      setIsLoadingConnections(false);
    }
  }, [user]);

  // Load Follow Requests
  const fetchRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const res = await socialService.getFollowRequests(undefined, 50);
      setRequests(res.items);
    } catch (err) {
      console.error("Failed to fetch follow requests", err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (activeTab === "all") {
        await fetchConnections();
      } else if (activeTab === "requests") {
        await fetchRequests();
      }
    };
    if (isMounted) {
      void load();
    }
    return () => {
      isMounted = false;
    };
  }, [activeTab, fetchConnections, fetchRequests]);

  // Debounced search for Tab 3
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      if (!discoverQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await userService.searchUsers(discoverQuery.trim(), 10);
        // Exclude current user
        setSearchResults(
          results.filter((r: SocialUserItemDto) => r.id !== user?.id),
        );
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [discoverQuery, user?.id]);

  const handleStartChatWithFriend = async (friendId: string) => {
    await startNewChat(friendId);
    router.push("/chat");
  };

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await socialService.acceptFollowRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      void fetchConnections();
    } catch (err) {
      console.error("Failed to accept request", err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      await socialService.declineFollowRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Failed to decline request", err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleToggleFollow = async (
    targetUserId: string,
    isCurrentlyFollowing: boolean,
  ) => {
    setFollowingMap((prev) => ({
      ...prev,
      [targetUserId]: !isCurrentlyFollowing,
    }));
    try {
      if (isCurrentlyFollowing) {
        await socialService.unfollowUser(targetUserId);
      } else {
        await socialService.followUser(targetUserId);
      }
      void fetchConnections();
    } catch (err) {
      // Rollback
      setFollowingMap((prev) => ({
        ...prev,
        [targetUserId]: isCurrentlyFollowing,
      }));
      console.error("Follow toggle error", err);
    }
  };

  const handleShareQrCode = () => {
    const url = `${window.location.origin}/profile/${user?.username || ""}`;
    void navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const friendTabs: TabItem[] = [
    {
      id: "all",
      label: `My Connections (${connections.length})`,
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      id: "requests",
      label: `Requests ${requests.length > 0 ? `(${requests.length})` : ""}`,
      icon: <UserPlus className="h-3.5 w-3.5" />,
    },
    {
      id: "add",
      label: "Discover & Add",
      icon: <QrCode className="h-3.5 w-3.5" />,
    },
  ];

  const filteredConnections = connections.filter(
    (c) =>
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 select-none">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Friends & Connections
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your network, handle incoming requests, and connect with
            creators.
          </p>
        </div>
        <Link href="/settings/qrcode">
          <Button
            size="sm"
            variant="glass"
            className="gap-1.5 font-bold text-purple-300"
          >
            <QrCode className="h-4 w-4" />
            <span>My QR Code</span>
          </Button>
        </Link>
      </div>

      <Tabs tabs={friendTabs} activeTab={activeTab} onChange={setActiveTab} fullWidth />

      {/* Tab 1: All Connections */}
      {activeTab === "all" && (
        <div className="space-y-4">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search connections by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 text-xs"
          />

          {isLoadingConnections ? (
            <div className="flex items-center justify-center py-16 gap-2 text-white/40">
              <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              <span className="text-xs">Loading connections...</span>
            </div>
          ) : filteredConnections.length > 0 ? (
            <div className="space-y-3">
              {filteredConnections.map((friend) => (
                <Card
                  key={friend.id}
                  className="glass-panel p-3.5 border-white/10 flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/profile/${friend.username}`}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <Avatar
                      src={friend.avatarUrl || ""}
                      alt={friend.displayName}
                      online={true}
                      isVerified={friend.isVerified}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors truncate">
                          {friend.displayName}
                        </span>
                        {friend.isVerified && (
                          <BadgeCheck className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{friend.username}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleStartChatWithFriend(friend.id)}
                      size="xs"
                      variant="glass"
                      className="text-purple-300 font-semibold"
                    >
                      Chat
                    </Button>
                    <Link href={`/profile/${friend.username}`}>
                      <Button size="xs" variant="glass">
                        Profile
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 glass-panel rounded-3xl border border-white/10 space-y-2">
              <Users className="h-8 w-8 text-purple-400/40 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                No connections found
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {searchQuery
                  ? "No matching friends found for your search query."
                  : "Start following friends and creators to build your personal network."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Follow Requests */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {isLoadingRequests ? (
            <div className="flex items-center justify-center py-16 gap-2 text-white/40">
              <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              <span className="text-xs">Loading follow requests...</span>
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-3">
              {requests.map((req) => (
                <Card
                  key={req.id}
                  className="glass-panel p-4 border-white/10 flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/profile/${req.username}`}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <Avatar
                      src={req.avatarUrl || ""}
                      alt={req.displayName}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors truncate">
                          {req.displayName}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{req.username} •{" "}
                        {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleAcceptRequest(req.id)}
                      disabled={processingRequestId === req.id}
                      size="xs"
                      className="gradient-bg-primary gap-1 font-bold"
                    >
                      {processingRequestId === req.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Accept</span>
                    </Button>
                    <Button
                      onClick={() => handleDeclineRequest(req.id)}
                      disabled={processingRequestId === req.id}
                      size="xs"
                      variant="glass"
                      className="text-rose-400 hover:text-rose-300 gap-1 font-semibold"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Decline</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 glass-panel rounded-3xl border border-white/10 space-y-2">
              <UserCheck className="h-8 w-8 text-emerald-400/40 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                No pending requests
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                When people request to follow your private account, they will
                appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Discover & Add by Username */}
      {activeTab === "add" && (
        <div className="space-y-6">
          <Card className="glass-panel p-5 sm:p-6 border-white/10 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Find & Add Friends
              </h3>
              <p className="text-xs text-muted-foreground">
                Search for any user across MixChat to connect or view their
                profile.
              </p>
            </div>

            <Input
              icon={
                isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                ) : (
                  <Search className="h-4 w-4" />
                )
              }
              placeholder="Type a username or display name..."
              value={discoverQuery}
              onChange={(e) => setDiscoverQuery(e.target.value)}
              className="h-11 text-xs"
            />

            {searchResults.length > 0 && (
              <div className="space-y-2.5 pt-2">
                {searchResults.map((userItem) => {
                  const isFollowing = followingMap[userItem.id] ?? false;

                  return (
                    <div
                      key={userItem.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl glass-card border border-white/5 hover:border-purple-500/30 transition-all"
                    >
                      <Link
                        href={`/profile/${userItem.username}`}
                        className="flex items-center gap-3 min-w-0 flex-1 group"
                      >
                        <Avatar
                          src={userItem.avatarUrl || ""}
                          alt={userItem.displayName}
                          size="md"
                          isVerified={userItem.isVerified}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors truncate">
                              {userItem.displayName}
                            </span>
                            {userItem.isVerified && (
                              <BadgeCheck className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            @{userItem.username}
                          </p>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={() =>
                            handleToggleFollow(userItem.id, isFollowing)
                          }
                          size="xs"
                          variant={isFollowing ? "glass" : "accent"}
                          className={
                            isFollowing
                              ? "text-muted-foreground"
                              : "gradient-bg-primary"
                          }
                        >
                          {isFollowing ? "Following" : "Follow"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Share profile card */}
          <Card className="glass-panel p-6 border-white/10 text-center space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Share Your MixChat Profile
            </h4>
            <div className="glass-card p-6 rounded-3xl border border-purple-500/30 inline-block text-center space-y-3">
              <div className="flex items-center justify-center gap-2 mx-auto">
                <Image
                  src="/mixchat-icon.png"
                  alt="Mix Chat Logo"
                  width={28}
                  height={34}
                  className="h-8 w-auto object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                />
                <span className="font-extrabold text-sm tracking-wider text-white">
                  MIX{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                    CHAT
                  </span>
                </span>
              </div>
              <p className="text-xs font-bold text-purple-300">
                @{user?.username || "you"}
              </p>
              <Button
                onClick={handleShareQrCode}
                size="sm"
                variant="accent"
                className="w-full gap-1.5 font-bold cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                <span>
                  {copiedLink
                    ? "Profile Link Copied!"
                    : "Share My Profile Link"}
                </span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
