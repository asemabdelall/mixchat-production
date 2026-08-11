"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Copy, Send, Film, Check, MessageSquare } from "lucide-react";
import { Reel } from "../types/reelTypes";
import { MOCK_USERS } from "@/shared/services/mockData";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useChat } from "@/shared/providers/ChatProvider";

interface ReelShareModalProps {
  reel: Reel;
  isOpen: boolean;
  onClose: () => void;
}

export const ReelShareModal: React.FC<ReelShareModalProps> = ({ reel, isOpen, onClose }) => {
  const router = useRouter();
  const { startNewChat, sendMessage } = useChat();
  const [copied, setCopied] = useState(false);
  const [sentUserIds, setSentUserIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/reels?id=${reel.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendDM = (targetUserId: string) => {
    const chatId = startNewChat(targetUserId);
    if (chatId) {
      sendMessage(chatId, `🎬 [Short Reel] ${reel.author.displayName}: "${reel.caption}"`, "text");
      setSentUserIds((prev) => [...prev, targetUserId]);
      setTimeout(() => {
        onClose();
        router.push("/chat");
      }, 600);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-center items-end sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-panel bg-[#090d18]/95 border border-white/10 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-300 select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-purple-400" />
            <h3 className="font-bold text-sm text-white">Share Short Reel</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close share sheet"
            className="p-1 rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl glass-card hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-purple-400" />}
            <span>{copied ? "Link Copied!" : "Copy Reel Link"}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              router.push("/stories");
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl glass-card hover:bg-white/10 border border-white/10 text-xs font-bold text-pink-300 transition-all cursor-pointer"
          >
            <Film className="h-4 w-4" />
            <span>Share to Story</span>
          </button>
        </div>

        {/* Send Direct Message Section */}
        <div className="space-y-2 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Send via Direct Message
          </p>
          <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
            {MOCK_USERS.slice(1).map((friend) => {
              const isSent = sentUserIds.includes(friend.id);

              return (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl glass-card border border-white/5 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={friend.avatar} alt={friend.displayName} size="sm" online={friend.online} />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-white truncate">{friend.displayName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">@{friend.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendDM(friend.id)}
                    disabled={isSent}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSent
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "gradient-bg-primary text-white hover:scale-105"
                    }`}
                  >
                    {isSent ? "Sent ✓" : "Send"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
