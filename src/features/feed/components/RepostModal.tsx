"use client";

import React, { useState } from "react";
import { Repeat2, Quote, Sparkles } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Post } from "@/types";
import { CURRENT_USER } from "@/shared/services/mockData";

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onRepost: (quoteText?: string) => void;
}

export const RepostModal: React.FC<RepostModalProps> = ({
  isOpen,
  onClose,
  post,
  onRepost,
}) => {
  const [mode, setMode] = useState<"choose" | "quote">("choose");
  const [quoteText, setQuoteText] = useState("");

  const handleQuickRepost = () => {
    onRepost();
    onClose();
  };

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteText.trim()) return;
    onRepost(quoteText.trim());
    setQuoteText("");
    setMode("choose");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Repost or Quote">
      {mode === "choose" ? (
        <div className="space-y-3">
          <button
            onClick={handleQuickRepost}
            className="w-full glass-card p-4 rounded-2xl border border-white/10 hover:border-purple-500/40 flex items-center gap-3.5 transition-all text-left group cursor-pointer"
          >
            <div className="p-3 rounded-xl gradient-bg-primary text-white shadow-md">
              <Repeat2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white group-hover:text-purple-300">Quick Repost</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Instantly share this post with your followers</p>
            </div>
          </button>

          <button
            onClick={() => setMode("quote")}
            className="w-full glass-card p-4 rounded-2xl border border-white/10 hover:border-purple-500/40 flex items-center gap-3.5 transition-all text-left group cursor-pointer"
          >
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Quote className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white group-hover:text-purple-300">Quote Post</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Add your own thoughts above the original post</p>
            </div>
          </button>
        </div>
      ) : (
        <form onSubmit={handleQuoteSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar src={CURRENT_USER.avatar} alt={CURRENT_USER.displayName} size="sm" />
            <span className="text-xs font-bold text-white">Quoting @{post.user.username}</span>
          </div>

          <textarea
            rows={3}
            autoFocus
            placeholder="Add a comment or thought..."
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {/* Compact Original Post Preview */}
          <div className="p-3 rounded-xl glass-card border border-white/10 text-xs space-y-1 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Avatar src={post.user.avatar} alt={post.user.displayName} size="sm" />
              <span className="font-bold text-foreground">{post.user.displayName}</span>
              <span className="text-[10px] text-muted-foreground">@{post.user.username}</span>
            </div>
            <p className="text-muted-foreground line-clamp-2">{post.content}</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode("choose")}>
              Back
            </Button>
            <Button type="submit" size="sm" disabled={!quoteText.trim()}>
              <Sparkles className="h-4 w-4" />
              <span>Publish Quote</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
