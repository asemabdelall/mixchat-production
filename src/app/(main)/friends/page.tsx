"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, UserPlus, Search, Check, X, QrCode, Share2 } from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { Tabs, TabItem } from "@/shared/components/ui/Tabs";
import { MOCK_USERS, MOCK_FRIEND_REQUESTS } from "@/shared/services/mockData";
import { FriendRequest } from "@/types";

const friendTabs: TabItem[] = [
  { id: "all", label: "My Friends (124)", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "requests", label: "Requests (2)", icon: <UserPlus className="h-3.5 w-3.5" /> },
  { id: "add", label: "Add Friends", icon: <QrCode className="h-3.5 w-3.5" /> },
];

import { useChat } from "@/shared/providers/ChatProvider";
import { useRouter } from "next/navigation";

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [requests, setRequests] = useState<FriendRequest[]>(MOCK_FRIEND_REQUESTS);
  const [search, setSearch] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);
  const { startNewChat } = useChat();
  const router = useRouter();

  const handleStartChatWithFriend = (friendId: string) => {
    const chatId = startNewChat(friendId);
    if (chatId) {
      router.push("/chat");
    }
  };

  const handleAccept = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDecline = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSendAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setAddUsername("");
    }, 1500);
  };

  const friendsList = MOCK_USERS.filter((u) => u.id !== "u_me");

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white gradient-text">Friends & Connections</h1>
        <Link href="/settings/qrcode">
          <Button size="sm" variant="glass" className="gap-1.5 font-bold text-purple-300">
            <QrCode className="h-4 w-4" />
            <span>My QR Code</span>
          </Button>
        </Link>
      </div>

      <Tabs tabs={friendTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "all" ? (
        <div className="space-y-4">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search friends by name or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 text-xs"
          />

          <div className="space-y-3">
            {friendsList
              .filter((f) => f.displayName.toLowerCase().includes(search.toLowerCase()))
              .map((friend) => (
                <Card key={friend.id} className="glass-panel p-4 border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={friend.avatar} alt={friend.displayName} online={friend.online} isVerified={friend.role === "verified"} />
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/profile/${friend.username}`} className="font-bold text-sm text-white hover:text-purple-400">
                          {friend.displayName}
                        </Link>
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                          🔥 12
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">@{friend.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleStartChatWithFriend(friend.id)}
                      size="xs"
                      variant="glass"
                      className="text-purple-300"
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
        </div>
      ) : activeTab === "requests" ? (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-12 glass-panel rounded-2xl border border-white/10">
              <p className="text-xs text-muted-foreground">No pending friend requests.</p>
            </div>
          ) : (
            requests.map((req) => (
              <Card key={req.id} className="glass-panel p-4 border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar src={req.sender.avatar} alt={req.sender.displayName} size="md" />
                  <div>
                    <h4 className="font-bold text-sm text-white">{req.sender.displayName}</h4>
                    <p className="text-xs text-muted-foreground">@{req.sender.username} • {req.createdAt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={() => handleAccept(req.id)} size="xs" className="bg-purple-600 hover:bg-purple-500 gap-1">
                    <Check className="h-3.5 w-3.5" />
                    <span>Accept</span>
                  </Button>
                  <Button onClick={() => handleDecline(req.id)} size="xs" variant="glass" className="text-rose-400 gap-1">
                    <X className="h-3.5 w-3.5" />
                    <span>Decline</span>
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Add by Username or Share QR */
        <Card className="glass-panel p-6 border-white/10 space-y-6 text-center">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Add Friends by Username</h3>
            <p className="text-xs text-muted-foreground">Enter their Mix Chat handle to send an instant request.</p>
          </div>

          <form onSubmit={handleSendAdd} className="flex gap-2 max-w-md mx-auto">
            <Input
              placeholder="Enter username (e.g. @sophiachen)"
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              className="h-11 text-xs"
            />
            <Button type="submit" className="h-11 px-5 shrink-0">
              {sentSuccess ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              <span>{sentSuccess ? "Sent!" : "Send"}</span>
            </Button>
          </form>

          <div className="pt-6 border-t border-white/10">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Or Share Your Mix QR Code</h4>
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
                  MIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">CHAT</span>
                </span>
              </div>
              <div className="p-3 bg-white rounded-2xl inline-block shadow-xl">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://mixchat.app/u/alexvance"
                  alt="QR Code"
                  className="w-36 h-36"
                />
              </div>
              <p className="text-xs font-bold text-purple-300">@alexvance</p>
              <Button size="sm" variant="accent" className="w-full gap-1.5 font-bold">
                <Share2 className="h-4 w-4" />
                <span>Share My QR Code</span>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
