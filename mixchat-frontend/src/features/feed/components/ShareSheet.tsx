"use client";

import React, { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  Send,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Post } from "@/types";
import { useChat } from "@/shared/providers/ChatProvider";

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onShareToStory?: () => void;
  onShowToast?: (msg: string) => void;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({
  isOpen,
  onClose,
  post,
  onShareToStory,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const { chats, sendMessage, currentUserId } = useChat();
  const [sentChatId, setSentChatId] = useState<string | null>(null);

  const postUrl =
    typeof window === "undefined"
      ? `/feed/${post.id}`
      : `${window.location.origin}/feed/${post.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      onShowToast?.("Post link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast?.("Could not copy post link");
    }
  };

  const handleSendToChat = (chatId: string) => {
    const postSnippet = `Shared post from @${post.user.username}: "${post.content.slice(0, 60)}..." ${postUrl}`;
    void sendMessage(chatId, { type: "text", text: postSnippet });
    setSentChatId(chatId);
    onShowToast?.("Post sent in chat");
    setTimeout(() => {
      setSentChatId(null);
      onClose();
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Post">
      <div className="space-y-4">
        {/* Copy Link Section */}
        <div className="glass-card p-3 rounded-2xl border border-white/10 flex items-center justify-between gap-2">
          <span className="text-xs text-purple-300 font-mono truncate flex-1">
            {postUrl}
          </span>
          <Button
            onClick={handleCopyLink}
            size="xs"
            variant="gradient"
            className="shrink-0 gap-1.5"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copied ? "Copied" : "Copy Link"}</span>
          </Button>
        </div>

        {/* Quick Actions */}
        <div className={onShareToStory ? "grid grid-cols-2 gap-2.5" : "grid grid-cols-1 gap-2.5"}>
          {onShareToStory && (
            <button
              onClick={() => {
                onShareToStory();
                onClose();
              }}
              className="glass-card min-h-11 p-3 rounded-xl border border-white/10 hover:border-purple-500/40 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all hover:bg-white/5"
            >
              <Sparkles className="h-4 w-4 text-pink-400" />
              <span>Add to Story</span>
            </button>
          )}

          <button
            onClick={() => void handleCopyLink()}
            className="glass-card min-h-11 p-3 rounded-xl border border-white/10 hover:border-purple-500/40 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all hover:bg-white/5"
          >
            <Share2 className="h-4 w-4 text-cyan-400" />
            <span>External Link</span>
          </button>
        </div>

        {/* Direct Message Destination List */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Send to Mix Chat Friend</span>
          </h4>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {chats.slice(0, 4).map((chat) => {
              const partner =
                chat.participants.find((p) => p.id !== currentUserId) ||
                chat.participants[0];
              const isSent = sentChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-2 rounded-xl glass-card border border-white/5 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      src={partner.avatar}
                      alt={partner.displayName}
                      size="sm"
                      online={partner.online}
                    />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {partner.displayName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        @{partner.username}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSendToChat(chat.id)}
                    size="xs"
                    variant={isSent ? "secondary" : "glass"}
                    disabled={isSent}
                    className="gap-1 text-xs"
                  >
                    {isSent ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Send className="h-3 w-3 text-purple-400" />
                    )}
                    <span>{isSent ? "Sent" : "Send"}</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
