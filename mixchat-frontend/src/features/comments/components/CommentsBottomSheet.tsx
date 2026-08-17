"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Loader2 } from "lucide-react";
import {
  CommentDto,
  commentsService,
} from "../../../services/comments/commentsService";
import { CommentItem } from "./CommentItem";
import { CommentComposer } from "./CommentComposer";

export interface CommentsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  reelId?: string;
  commentsCount?: number;
  onCommentsCountChange?: (newCount: number) => void;
}

const emptySubscribe = () => () => {};

export const CommentsBottomSheet: React.FC<CommentsBottomSheetProps> = ({
  isOpen,
  onClose,
  postId,
  reelId,
  commentsCount = 0,
  onCommentsCountChange,
}) => {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const targetId = postId || reelId;
  const isReel = !!reelId;

  const [comments, setComments] = useState<CommentDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [localCount, setLocalCount] = useState<number | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentDto | null>(null);

  const displayCount = localCount !== null ? localCount : commentsCount;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(
    async (targetCursor?: string) => {
      if (!targetId) return;
      setIsLoading(true);
      try {
        const res = isReel
          ? await commentsService.getReelComments(targetId, {
              cursor: targetCursor,
              limit: 20,
            })
          : await commentsService.getPostComments(targetId, {
              cursor: targetCursor,
              limit: 20,
            });

        if (!targetCursor) {
          setComments(res.items);
        } else {
          setComments((prev) => [...prev, ...res.items]);
        }
        setCursor(res.pageInfo.nextCursor ?? null);
        setHasNextPage(res.pageInfo.hasNextPage);
      } catch (err) {
        console.error("Failed to fetch comments", err);
      } finally {
        setIsLoading(false);
      }
    },
    [targetId, isReel],
  );

  // Load initial comments on open
  useEffect(() => {
    let active = true;
    if (isOpen && targetId) {
      const load = async () => {
        try {
          const res = isReel
            ? await commentsService.getReelComments(targetId, { limit: 20 })
            : await commentsService.getPostComments(targetId, { limit: 20 });
          if (active) {
            setComments(res.items);
            setCursor(res.pageInfo.nextCursor ?? null);
            setHasNextPage(res.pageInfo.hasNextPage);
            setIsLoading(false);
          }
        } catch (err) {
          console.error("Failed to load initial comments", err);
          if (active) setIsLoading(false);
        }
      };
      void load();
    }
    return () => {
      active = false;
    };
  }, [isOpen, targetId, isReel]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCreateCommentOrReply = async (content: string) => {
    if (!targetId) return;
    setIsSubmitting(true);
    try {
      if (replyTarget) {
        // Create reply (shared for both posts and reels)
        await commentsService.createReply(replyTarget.id, content);
        // Update root comment reply count optimistically
        setComments((prev) =>
          prev.map((c) => {
            const rootId =
              replyTarget.parentId === null
                ? replyTarget.id
                : replyTarget.rootId || replyTarget.id;
            if (c.id === rootId) {
              return {
                ...c,
                stats: {
                  ...c.stats,
                  repliesCount: c.stats.repliesCount + 1,
                },
              };
            }
            return c;
          }),
        );
        setReplyTarget(null);
      } else {
        // Create top-level comment
        const newComment = isReel
          ? await commentsService.createReelComment(targetId, content)
          : await commentsService.createComment(targetId, content);
        setComments((prev) => [newComment, ...prev]);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }

      const nextCount = displayCount + 1;
      setLocalCount(nextCount);
      onCommentsCountChange?.(nextCount);
    } catch (err) {
      console.error("Failed to create comment/reply", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await commentsService.deleteComment(commentId);
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            isDeleted: true,
            author: null,
            content: null,
          };
        }
        return c;
      }),
    );
    const nextCount = Math.max(0, displayCount - 1);
    setLocalCount(nextCount);
    onCommentsCountChange?.(nextCount);
  };

  const handleUpdateComment = async (commentId: string, newContent: string) => {
    const updated = await commentsService.updateComment(commentId, newContent);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, ...updated } : c)),
    );
  };

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet Card */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-[480px] bg-[#121218] border border-white/10 sm:rounded-3xl rounded-t-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col h-[82vh] sm:h-[620px] max-h-[85vh] overflow-hidden"
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="w-8" />
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-sm">Comments</h3>
                {displayCount > 0 && (
                  <span className="text-[11px] font-semibold text-white/40">
                    ({displayCount})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close comments"
                className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments Scrollable Feed */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2.5"
            >
              {isLoading && comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/40">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <span className="text-xs">Loading comments...</span>
                </div>
              ) : comments.length > 0 ? (
                <>
                  <div className="space-y-1">
                    {comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        onReply={(c) => setReplyTarget(c)}
                        onDelete={handleDeleteComment}
                        onUpdate={handleUpdateComment}
                      />
                    ))}
                  </div>

                  {hasNextPage && (
                    <div className="pt-2 pb-1 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (cursor) void fetchComments(cursor);
                        }}
                        disabled={isLoading}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-purple-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? "Loading..." : "Load more comments"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-center text-white/40">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-purple-400/80 mb-1">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white/90 text-sm">
                    No comments yet
                  </h4>
                  <p className="text-xs text-white/40 max-w-xs">
                    Start the conversation.
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Bottom Instagram-Style Composer */}
            <div className="p-3 border-t border-white/10 bg-[#121218] shrink-0">
              <CommentComposer
                placeholder={
                  replyTarget
                    ? `Reply to @${replyTarget.author?.username || "user"}...`
                    : "Add a comment..."
                }
                replyingTo={
                  replyTarget && replyTarget.author
                    ? {
                        id: replyTarget.id,
                        username: replyTarget.author.username,
                        displayName: replyTarget.author.displayName,
                      }
                    : null
                }
                onCancelReply={() => setReplyTarget(null)}
                onSubmit={handleCreateCommentOrReply}
                isSubmitting={isSubmitting}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
