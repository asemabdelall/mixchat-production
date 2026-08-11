"use client";

import React, { useState } from "react";
import { Ghost, Sparkles, Zap, RefreshCw, ArrowRight, Copy, Check } from "lucide-react";
import { useChat } from "@/shared/providers/ChatProvider";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useRouter } from "next/navigation";
import { CURRENT_USER } from "@/shared/services/mockData";

const topics = [
  "🔮 AI & Future Tech",
  "🎧 Chill Music & Beats",
  "🌙 Late Night Deep Talks",
  "🎮 Gaming & Esports",
  "🎨 Design & Digital Art",
];

export const AnonymousRadar: React.FC = () => {
  const { anonymousMatch, startAnonymousSearch, cancelAnonymousSearch, setActiveChatId, chats } = useChat();
  const [activeTab, setActiveTab] = useState<"radar" | "link">("radar");
  const [selectedTopic, setSelectedTopic] = useState(topics[0]);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const anonLink = `mixchat.me/anon/${CURRENT_USER.username}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${anonLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartMatch = () => {
    startAnonymousSearch(selectedTopic);
  };

  const handleEnterChat = () => {
    setActiveChatId("chat_anon_1");
    router.push("/chat");
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] py-4">
      {/* Top Tab Switcher */}
      <div className="flex items-center gap-2 p-1 rounded-2xl glass-card border border-white/10 mb-6 w-full max-w-md">
        <button
          onClick={() => setActiveTab("radar")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "radar"
              ? "gradient-bg-primary text-white shadow-md shadow-purple-500/30"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>Random Match Radar</span>
        </button>

        <button
          onClick={() => setActiveTab("link")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "link"
              ? "gradient-bg-primary text-white shadow-md shadow-purple-500/30"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Ghost className="h-4 w-4" />
          <span>My Secret Anon Link</span>
        </button>
      </div>

      {activeTab === "link" ? (
        /* Secret Link Generator & Inbox Card */
        <Card className="glass-panel p-8 w-full border-white/10 text-center flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl gradient-bg-accent text-white shadow-2xl mb-4">
            <Ghost className="h-10 w-10 animate-bounce" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Receive Secret Messages</h2>
          <p className="text-xs text-muted-foreground max-w-sm mb-6">
            Share your unique anonymous link on Instagram, Snapchat, or X to receive secret questions & secret messages!
          </p>

          <div className="w-full glass-card p-4 rounded-2xl border border-purple-500/30 mb-6 flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-purple-300 truncate select-all">{anonLink}</span>
            <Button onClick={handleCopyLink} size="sm" variant="gradient" className="shrink-0 h-9 px-3 gap-1.5">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </Button>
          </div>

          <div className="w-full text-left">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Anonymous Inbox ({chats.filter((c) => c.isAnonymous).length})
            </h3>

            <div className="space-y-3">
              {chats
                .filter((c) => c.isAnonymous)
                .map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      router.push("/chat");
                    }}
                    className="glass-card p-4 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg-accent text-white shadow-md">
                        <Ghost className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-white">Secret Message</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {chat.lastMessage?.text || "New anonymous message received..."}
                        </p>
                      </div>
                    </div>

                    <Button size="xs" variant="glass" className="text-purple-300">
                      <span>Reply</span>
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      ) : !anonymousMatch ? (
        <Card className="glass-panel p-8 w-full border-white/10 text-center flex flex-col items-center">
          {/* Glowing Emblem */}
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-bg-accent text-white shadow-2xl">
              <Ghost className="h-10 w-10 animate-bounce" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Anonymous Chat Match</h2>
          <p className="text-xs text-muted-foreground max-w-md mb-6">
            Connect instantly with verified strangers worldwide. Your identity remains 100% hidden unless you choose to reveal it.
          </p>

          {/* Topic Select Pills */}
          <div className="w-full text-left mb-6">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">
              Select Discussion Topic:
            </label>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTopic(t)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    selectedTopic === t
                      ? "gradient-bg-primary text-white shadow-md shadow-purple-500/30"
                      : "glass-card text-muted-foreground hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleStartMatch}
            size="lg"
            className="w-full h-13 text-base gradient-bg-accent shadow-xl shadow-pink-500/25"
          >
            <Zap className="h-5 w-5 fill-white" />
            <span>Find Anonymous Partner</span>
          </Button>
        </Card>
      ) : anonymousMatch.status === "searching" ? (
        <Card className="glass-panel p-10 w-full border-white/10 text-center flex flex-col items-center">
          {/* Radar Pulse Animation */}
          <div className="relative mb-8 my-4">
            <span className="absolute -inset-8 rounded-full animate-radar gradient-bg-accent opacity-50" />
            <span className="absolute -inset-16 rounded-full animate-radar gradient-bg-primary opacity-30 delay-300" />
            <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full gradient-bg-primary text-white shadow-2xl">
              <RefreshCw className="h-10 w-10 animate-spin" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-1">Searching for a partner...</h3>
          <p className="text-xs text-purple-300 font-medium mb-6">Topic: {selectedTopic}</p>

          <Button onClick={cancelAnonymousSearch} variant="glass" size="sm">
            Cancel Search
          </Button>
        </Card>
      ) : (
        /* Connected Match Screen */
        <Card className="glass-panel p-8 w-full border-white/10 text-center flex flex-col items-center">
          <div className="flex items-center gap-6 mb-6">
            <div className="flex flex-col items-center">
              <Avatar
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                alt="You"
                size="xl"
              />
              <span className="text-xs font-semibold text-white mt-2">You</span>
            </div>

            <Sparkles className="h-8 w-8 text-pink-400 animate-pulse" />

            <div className="flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-bg-accent text-white shadow-xl">
                <Ghost className="h-10 w-10" />
              </div>
              <span className="text-xs font-semibold text-purple-300 mt-2">Anonymous Stranger</span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-1">Match Connected! 🎉</h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-6">
            You matched with a partner interested in <span className="text-purple-300 font-medium">{anonymousMatch.topic}</span>.
          </p>

          <Button onClick={handleEnterChat} size="lg" className="w-full h-12 text-base">
            <span>Open Anonymous Chat Room</span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Card>
      )}
    </div>
  );
};
