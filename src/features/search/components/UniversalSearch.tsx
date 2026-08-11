"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Hash, X, Clock, Flame, ImageIcon, MessageSquare } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Tabs, TabItem } from "@/shared/components/ui/Tabs";
import { Card } from "@/shared/components/ui/Card";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { MOCK_USERS, MOCK_POSTS } from "@/shared/services/mockData";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { MediaViewerModal } from "@/features/feed/components/MediaViewerModal";
import { useChat } from "@/shared/providers/ChatProvider";
import { MixPulseWidget } from "./MixPulseWidget";
import { ExploreV2Grid } from "./ExploreV2Grid";
import { Post } from "@/types";

const searchTabs: TabItem[] = [
  { id: "all", label: "Top" },
  { id: "users", label: "People" },
  { id: "posts", label: "Posts" },
  { id: "media", label: "Media Grid" },
  { id: "groups", label: "Groups" },
];

const DEFAULT_RECENTS = ["Sara Chen", "Khaled Vance", "Cyberpunk Creators", "Maya Lin"];

const TRENDING_TOPICS = [
  { tag: "#MixChatUI", postsCount: "24.5k posts", category: "Trending in Design" },
  { tag: "#CyberpunkVibes", postsCount: "18.2k posts", category: "Digital Art" },
  { tag: "#AIApps", postsCount: "42.1k posts", category: "Technology" },
  { tag: "#SFBeats", postsCount: "9.4k posts", category: "Music" },
];

export const UniversalSearch: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { startNewChat } = useChat();

  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("all");
  const [recents, setRecents] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_RECENTS;
    try {
      const saved = localStorage.getItem("mix_recent_searches");
      return saved ? JSON.parse(saved) : DEFAULT_RECENTS;
    } catch {
      return DEFAULT_RECENTS;
    }
  });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const handleRemoveRecent = (item: string) => {
    const updated = recents.filter((r) => r !== item);
    setRecents(updated);
    try {
      localStorage.setItem("mix_recent_searches", JSON.stringify(updated));
    } catch {
      // Fallback
    }
  };

  const handleClearAllRecents = () => {
    setRecents([]);
    try {
      localStorage.removeItem("mix_recent_searches");
    } catch {
      // Fallback
    }
  };

  const handleStartChat = (userId: string) => {
    const chatId = startNewChat(userId);
    if (chatId) router.push("/chat");
  };

  // Filtered dataset
  const filteredUsers = MOCK_USERS.filter((u) =>
    query ? u.displayName.toLowerCase().includes(query.toLowerCase()) || u.username.toLowerCase().includes(query.toLowerCase()) : true
  );

  const filteredPosts = MOCK_POSTS.filter((p) =>
    query ? p.content.toLowerCase().includes(query.toLowerCase()) : true
  );

  const mediaPosts = filteredPosts.filter((p) => p.mediaUrls && p.mediaUrls.length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Search Header Input Bar */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white gradient-text">Universal Search & Explore</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Discover creators, posts, short clips, and trending communities
          </p>
        </div>

        <div className="relative">
          <Input
            icon={<Search className="h-5 w-5" />}
            placeholder="Search creators @username, posts, media, or #hashtags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 text-sm"
            rightElement={
              query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="text-muted-foreground hover:text-white p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null
            }
          />
        </div>

        <Tabs tabs={searchTabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* When Query is Empty: Render Mix Pulse + Recent Searches + Explore V2 */}
      {!query ? (
        <div className="space-y-6">
          {/* MIX PULSE Ticker */}
          <MixPulseWidget />

          {/* Recent Searches Card */}
          {recents.length > 0 && (
            <Card className="glass-panel p-4 border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Recent Searches</span>
                </h3>
                <button
                  type="button"
                  onClick={handleClearAllRecents}
                  className="text-[11px] text-purple-400 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recents.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border border-white/10 text-xs text-white hover:border-purple-500/40 transition-colors"
                  >
                    <button type="button" onClick={() => setQuery(item)} className="cursor-pointer">
                      {item}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecent(item)}
                      aria-label={`Remove ${item}`}
                      className="text-muted-foreground hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Trending Topics Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-400" />
              <span>Trending Topics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TRENDING_TOPICS.map((topic, idx) => (
                <div
                  key={idx}
                  onClick={() => setQuery(topic.tag)}
                  className="glass-panel p-4 border-white/10 hover:border-purple-500/40 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      {topic.category}
                    </span>
                    <h4 className="font-bold text-sm text-purple-300 group-hover:text-purple-200 mt-0.5">
                      {topic.tag}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-1">{topic.postsCount}</p>
                  </div>
                  <Hash className="h-5 w-5 text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
              ))}
            </div>
          </div>

          {/* Explore V2 Visual Discovery Hub */}
          <ExploreV2Grid onStartChat={handleStartChat} />
        </div>
      ) : (
        /* When Query is Typed: Render Structured Category Results */
        <div className="space-y-6">
          {/* People Search Results */}
          {(activeTab === "all" || activeTab === "users") && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                People ({filteredUsers.length})
              </h3>

              {filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="glass-panel p-3.5 flex items-center justify-between border-white/10 gap-3">
                      <Link href={`/profile/${user.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                        <Avatar
                          src={user.avatar}
                          alt={user.displayName}
                          size="md"
                          online={user.online}
                          isVerified={user.role === "verified"}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-white group-hover:text-purple-300 transition-colors truncate">
                            {user.displayName}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
                          <p className="text-[10px] text-purple-300/80 truncate mt-0.5">
                            {user.bio ? `"${user.bio}"` : "San Francisco, CA"}
                          </p>
                        </div>
                      </Link>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link href={`/profile/${user.username}`}>
                          <Button size="xs" variant="glass" className="text-xs">
                            Profile
                          </Button>
                        </Link>
                        <Button
                          onClick={() => handleStartChat(user.id)}
                          size="xs"
                          className="gradient-bg-primary text-white text-xs font-bold gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>Chat</span>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 glass-panel rounded-2xl border border-white/10">
                  <p className="text-xs text-muted-foreground">No people matching &ldquo;{query}&rdquo;</p>
                </div>
              )}
            </div>
          )}

          {/* Media Grid Results */}
          {(activeTab === "all" || activeTab === "media") && mediaPosts.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-purple-400" />
                <span>Media Photos & Videos ({mediaPosts.length})</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {mediaPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="rounded-2xl overflow-hidden glass-card border border-white/10 group aspect-square relative cursor-pointer hover:border-purple-500/50 transition-all shadow-lg"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.mediaUrls?.[0]}
                      alt="Media"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Search Results */}
          {(activeTab === "all" || activeTab === "posts") && (
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Posts ({filteredPosts.length})
              </h3>

              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => <FeedPostCard key={post.id} post={post} />)
              ) : (
                <div className="text-center py-8 glass-panel rounded-2xl border border-white/10">
                  <p className="text-xs text-muted-foreground">No posts matching &ldquo;{query}&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Media Viewer Modal when media result is clicked */}
      {selectedPost && (
        <MediaViewerModal
          isOpen={!!selectedPost}
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
};
