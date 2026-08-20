"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MoreHorizontal,
  Check,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  BadgeCheck,
} from "lucide-react";
import {
  CommentDto,
  commentsService,
} from "../../../services/comments/commentsService";
import { MentionText } from "./MentionText";
import { AvatarImage } from "@/shared/components/ui/AvatarImage";

interface CommentItemProps {
  comment: CommentDto;
  onReply?: (comment: CommentDto) => void;
  onDelete?: (commentId: string) => Promise<void>;
  onUpdate?: (commentId: string, newContent: string) => Promise<void>;
  isChild?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onDelete,
  onUpdate,
  isChild = false,
}) => {
  // Optimistic like state
  const [hasLiked, setHasLiked] = useState(comment.viewer.hasLiked);
  const [likesCount, setLikesCount] = useState(comment.stats.likesCount);
  const [isLiking, setIsLiking] = useState(false);

  // Author options menu & inline edit state
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content || "");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Threaded replies expansion state
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<CommentDto[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [replyCursor, setReplyCursor] = useState<string | null>(null);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);

  const formatRelativeTime = (isoString: string): string => {
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

      if (diffSec < 60) return "now";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d`;
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks}w`;
    } catch {
      return "";
    }
  };

  const handleToggleLike = async () => {
    if (isLiking || comment.isDeleted) return;
    setIsLiking(true);

    const prevLiked = hasLiked;
    const prevCount = likesCount;

    // Optimistic toggle
    setHasLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      if (prevLiked) {
        const res = await commentsService.unlikeComment(comment.id);
        setHasLiked(res.hasLiked);
        setLikesCount(res.likesCount);
      } else {
        const res = await commentsService.likeComment(comment.id);
        setHasLiked(res.hasLiked);
        setLikesCount(res.likesCount);
      }
    } catch {
      // Revert on error
      setHasLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || isSavingEdit || trimmed === comment.content) {
      setIsEditing(false);
      return;
    }

    setIsSavingEdit(true);
    try {
      if (onUpdate) {
        await onUpdate(comment.id, trimmed);
      } else {
        await commentsService.updateComment(comment.id, trimmed);
      }
      setIsEditing(false);
    } catch {
      // Error handled
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteComment = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(comment.id);
      } else {
        await commentsService.deleteComment(comment.id);
      }
    } catch {
      // Error handled
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  const handleToggleReplies = async () => {
    if (!showReplies && replies.length === 0) {
      setIsLoadingReplies(true);
      try {
        const res = await commentsService.getCommentReplies(comment.id);
        setReplies(res.items);
        setReplyCursor(res.pageInfo.nextCursor ?? null);
        setHasMoreReplies(res.pageInfo.hasNextPage);
        setShowReplies(true);
      } catch {
        // Handle error
      } finally {
        setIsLoadingReplies(false);
      }
    } else {
      setShowReplies((prev) => !prev);
    }
  };

  const handleLoadMoreReplies = async () => {
    if (!replyCursor || isLoadingReplies) return;
    setIsLoadingReplies(true);
    try {
      const res = await commentsService.getCommentReplies(comment.id, {
        cursor: replyCursor,
      });
      setReplies((prev) => [...prev, ...res.items]);
      setReplyCursor(res.pageInfo.nextCursor ?? null);
      setHasMoreReplies(res.pageInfo.hasNextPage);
    } catch {
      // Handle error
    } finally {
      setIsLoadingReplies(false);
    }
  };

  // 1. Tombstone display for deleted comments
  if (comment.isDeleted) {
    return (
      <div className={`space-y-1.5 ${isChild ? "pl-9" : ""}`}>
        <div className="flex items-center gap-2 text-xs py-2 px-3 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 italic">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-white/30" />
          <span>This comment was deleted</span>
        </div>

        {/* Render child replies if any exist */}
        {comment.stats.repliesCount > 0 && (
          <div className="pt-1 pl-3">
            <button
              type="button"
              onClick={handleToggleReplies}
              className="flex items-center text-[11px] text-white/40 hover:text-white font-semibold cursor-pointer py-1 transition-colors"
            >
              <span>
                {showReplies
                  ? "Hide replies"
                  : `View ${comment.stats.repliesCount} replies`}
              </span>
            </button>

            {showReplies && (
              <div className="space-y-2 pt-2">
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    isChild
                    onReply={onReply}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group relative space-y-1.5 ${isChild ? "pl-8 sm:pl-9" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 py-1.5 hover:bg-white/[0.02] rounded-xl px-1.5 transition-colors">
        {/* Left: Author Avatar */}
        <Link
          href={`/profile/${comment.author?.username || ""}`}
          className={`shrink-0 rounded-full overflow-hidden bg-white/10 ring-1 ring-white/10 hover:opacity-80 transition-opacity ${
            isChild ? "w-6 h-6 mt-0.5" : "w-8 h-8 mt-0.5"
          }`}
        >
          <AvatarImage
            src={comment.author?.avatarUrl}
            alt={comment.author?.displayName || "User"}
            className="h-full w-full object-cover"
          />
        </Link>

        {/* Center: Content & Metadata */}
        <div className="flex-1 min-w-0 pr-1">
          {isEditing ? (
            <div className="space-y-2 my-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none resize-none leading-relaxed"
                rows={2}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || !editContent.trim()}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold gradient-bg-primary text-white hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isSavingEdit ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs leading-relaxed break-words">
              {/* Instagram Inline Username + Content */}
              <Link
                href={`/profile/${comment.author?.username || ""}`}
                className="font-bold text-white hover:text-purple-300 transition-colors inline-flex items-center gap-1 mr-1.5"
              >
                <span>{comment.author?.username}</span>
                {comment.author?.isVerified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20 inline shrink-0" />
                )}
              </Link>
              <MentionText
                content={comment.content || ""}
                className="text-white/90"
              />
            </div>
          )}

          {/* Bottom Actions Row: Timestamp, Likes, Reply, Edit/Delete */}
          <div className="flex items-center gap-3 mt-1 text-[11px] text-white/40 font-medium">
            <span>{formatRelativeTime(comment.createdAt)}</span>

            {likesCount > 0 && (
              <span className="font-semibold text-white/50">
                {likesCount} {likesCount === 1 ? "like" : "likes"}
              </span>
            )}

            {onReply && !comment.isDeleted && (
              <button
                type="button"
                onClick={() => onReply(comment)}
                className="font-semibold text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                Reply
              </button>
            )}

            {comment.editedAt && (
              <span className="text-[10px] text-white/30 italic">(edited)</span>
            )}

            {/* Author Actions Menu Dropdown */}
            {(comment.viewer.canEdit || comment.viewer.canDelete) && (
              <div className="relative inline-flex items-center">
                <button
                  type="button"
                  onClick={() => setShowMenu((prev) => !prev)}
                  aria-label="More options"
                  className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity p-0.5 rounded cursor-pointer"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>

                {showMenu && (
                  <div className="absolute left-0 top-full mt-1 z-30 w-28 bg-[#1a1426] border border-white/10 rounded-xl p-1 shadow-2xl space-y-0.5">
                    {comment.viewer.canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3 text-purple-400" />
                        Edit
                      </button>
                    )}
                    {comment.viewer.canDelete && (
                      <button
                        type="button"
                        onClick={handleDeleteComment}
                        disabled={isDeleting}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Instagram-Style Heart Button */}
        {!comment.isDeleted && (
          <div className="shrink-0 pt-1 flex flex-col items-center">
            <button
              type="button"
              onClick={handleToggleLike}
              aria-label="Like comment"
              className="p-1 hover:scale-110 active:scale-90 transition-transform cursor-pointer"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={hasLiked ? "liked" : "unliked"}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      hasLiked
                        ? "fill-rose-500 text-rose-500"
                        : "text-white/40 hover:text-white transition-colors"
                    }`}
                  />
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        )}
      </div>

      {/* Threaded Child Replies (Instagram Style) */}
      {!isChild && (comment.stats.repliesCount > 0 || replies.length > 0) && (
        <div className="pl-10">
          <button
            type="button"
            onClick={handleToggleReplies}
            className="flex items-center text-[11px] text-white/40 hover:text-white font-semibold cursor-pointer py-1 transition-colors"
          >
            {isLoadingReplies ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                Loading replies...
              </span>
            ) : (
              <span>
                {showReplies
                  ? "Hide replies"
                  : `View ${comment.stats.repliesCount || replies.length} replies`}
              </span>
            )}
          </button>

          {showReplies && (
            <div className="space-y-1.5 pt-1">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  isChild
                  onReply={onReply}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                />
              ))}

              {hasMoreReplies && (
                <button
                  type="button"
                  onClick={handleLoadMoreReplies}
                  disabled={isLoadingReplies}
                  className="flex items-center gap-2 text-[11px] text-purple-400 hover:text-purple-300 font-semibold pl-8 py-1 cursor-pointer transition-colors"
                >
                  {isLoadingReplies && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  Load more replies
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
