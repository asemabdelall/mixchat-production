"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { userService, SocialUserItemDto } from "@/services/user/userService";
import { useAuth } from "@/shared/providers/AuthProvider";
import { AvatarImage } from "@/shared/components/ui/AvatarImage";

interface CommentComposerProps {
  placeholder?: string;
  replyingTo?: { id: string; username: string; displayName?: string } | null;
  onCancelReply?: () => void;
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const INSTAGRAM_QUICK_EMOJIS = ["❤️", "🙌", "🔥", "👏", "😂", "😍", "😮", "😢"];

export const CommentComposer: React.FC<CommentComposerProps> = ({
  placeholder = "Add a comment...",
  replyingTo = null,
  onCancelReply,
  onSubmit,
  isSubmitting = false,
  autoFocus = false,
  className = "",
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<
    SocialUserItemDto[]
  >([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when reply target changes or autoFocus is true
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle mention detection
  const handleContentChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const val = e.target.value;
    setContent(val);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]{1,30})$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      try {
        const results = await userService.searchUsers(query, 5);
        setMentionSuggestions(results);
        setSelectedIndex(0);
      } catch {
        setMentionSuggestions([]);
      }
    } else {
      setMentionQuery(null);
      setMentionSuggestions([]);
    }
  };

  const handleSelectMention = (targetUser: SocialUserItemDto) => {
    if (!inputRef.current) return;
    const cursorPos = inputRef.current.selectionStart || 0;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);

    const mentionPrefixIndex = textBeforeCursor.lastIndexOf("@");
    if (mentionPrefixIndex !== -1) {
      const prefix = textBeforeCursor.slice(0, mentionPrefixIndex);
      const newText = `${prefix}@${targetUser.username} ${textAfterCursor}`;
      setContent(newText);
      setMentionQuery(null);
      setMentionSuggestions([]);

      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos =
            mentionPrefixIndex + targetUser.username.length + 2;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    try {
      await onSubmit(trimmed);
      setContent("");
      setMentionQuery(null);
      setMentionSuggestions([]);
    } catch {
      // Error handled by parent
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = mentionSuggestions[selectedIndex];
        if (selected) {
          handleSelectMention(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        setMentionSuggestions([]);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className={`relative flex flex-col gap-2 ${className}`}>
      {/* Replying Banner Pill */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300 animate-in fade-in slide-in-from-bottom-1 duration-150">
          <span className="truncate text-[11px]">
            Replying to{" "}
            <strong className="text-purple-200 font-semibold">
              @{replyingTo.username}
            </strong>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-0.5 hover:bg-purple-500/20 rounded-md text-purple-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mention Autocomplete Popup */}
      {mentionSuggestions.length > 0 && (
        <div className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-[#1e1430]/98 backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] uppercase font-bold text-white/40 px-2 py-1">
            Mention a user
          </p>
          {mentionSuggestions.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectMention(item)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                idx === selectedIndex
                  ? "bg-purple-600/30 text-white font-semibold"
                  : "text-white/80 hover:bg-white/5"
              }`}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 shrink-0">
                <AvatarImage
                  src={item.avatarUrl}
                  alt={item.username}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="truncate text-xs">
                <span className="text-white font-medium">@{item.username}</span>
                {item.displayName && item.displayName !== item.username && (
                  <span className="text-white/40 ml-1.5 text-[11px]">
                    ({item.displayName})
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Instagram 1-Tap Quick Emoji Reactions Bar */}
      <div className="flex items-center justify-between px-1 overflow-x-auto scrollbar-none gap-1 pt-0.5">
        {INSTAGRAM_QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleInsertEmoji(emoji)}
            className="text-lg hover:scale-125 active:scale-95 transition-transform cursor-pointer p-0.5"
            aria-label={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Instagram-Style Input Bar with Avatar on Left & Post button on Right */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5 pt-1">
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0 ring-1 ring-white/10">
          <AvatarImage
            src={user?.avatarUrl}
            alt={user?.displayName || user?.username || "User"}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Floating Input Pill */}
        <div className="flex-1 flex items-center bg-white/[0.04] hover:bg-white/[0.07] focus-within:bg-white/[0.08] border border-white/10 focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/20 rounded-full pl-4 pr-2 py-2 transition-all duration-200">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-xs font-medium text-white placeholder:text-white/35 focus:outline-none focus-visible:outline-none leading-relaxed border-none ring-0 focus:ring-0"
          />

          {/* Instagram "Post" Text Button */}
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 disabled:opacity-30 disabled:pointer-events-none transition-opacity px-2.5 py-1 cursor-pointer shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Post"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
