"use client";

import React, { useState } from "react";
import { X, Send, Heart, MessageSquare } from "lucide-react";
import { Reel } from "../types/reelTypes";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useReels } from "@/shared/providers/ReelsProvider";

interface ReelCommentsSheetProps {
  reel: Reel;
  isOpen: boolean;
  onClose: () => void;
}

export const ReelCommentsSheet: React.FC<ReelCommentsSheetProps> = ({ reel, isOpen, onClose }) => {
  const { addReelComment } = useReels();
  const [commentText, setCommentText] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addReelComment(reel.id, commentText);
    setCommentText("");
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-center items-end sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg glass-panel bg-[#090d18]/95 border border-white/10 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col h-[70vh] sm:h-[600px] animate-in slide-in-from-bottom duration-300 select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-400" />
            <h3 className="font-bold text-sm text-white">Comments ({reel.commentsCount})</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comments"
            className="p-1 rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comment List Stream */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-4 pr-1">
          {reel.comments && reel.comments.length > 0 ? (
            reel.comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 group">
                <Avatar src={comment.user.avatar} alt={comment.user.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-xs text-white truncate">{comment.user.displayName}</span>
                      <span className="text-[10px] text-muted-foreground">@{comment.user.username}</span>
                      <span className="text-[10px] text-muted-foreground">• {comment.createdAt}</span>
                    </div>
                    <button className="text-muted-foreground hover:text-pink-400 transition-colors cursor-pointer flex items-center gap-1 text-[10px]">
                      <Heart className="h-3 w-3" />
                      <span>{comment.likesCount}</span>
                    </button>
                  </div>
                  <p className="text-xs text-foreground/90 mt-1 leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-xs text-muted-foreground">No comments yet. Be the first to start the conversation! 💬</p>
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form onSubmit={handleSubmit} className="pt-3 border-t border-white/10 shrink-0 flex items-center gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a public comment..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50"
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="p-2.5 rounded-2xl gradient-bg-primary text-white disabled:opacity-40 hover:scale-105 transition-transform cursor-pointer shadow-md shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
