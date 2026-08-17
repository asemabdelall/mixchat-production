"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  MessageCircle,
  Heart,
  Share2,
  Bookmark,
  Repeat2,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { FeedPostCard } from "@/features/feed/components/FeedPostCard";
import { postsService, mapDtoToPost } from "@/services/feed/postsService";
import {
  CommentDto,
  commentsService,
} from "@/services/comments/commentsService";
import { CommentItem } from "@/features/comments/components/CommentItem";
import { CommentComposer } from "@/features/comments/components/CommentComposer";
import { Post } from "@/types";
import { formatNumber } from "@/lib/utils";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Discussion comments state
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [isSubmittingComment, setIsSubmittingComment] =
    useState<boolean>(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [replyTarget, setReplyTarget] = useState<CommentDto | null>(null);

  const commentsTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!postId) return;
      setIsLoadingPost(true);
      setIsLoadingComments(true);
      setError(null);

      try {
        const [postDto, commentsRes] = await Promise.all([
          postsService.getPost(postId),
          commentsService.getPostComments(postId, { limit: 20 }),
        ]);

        if (isMounted) {
          setPost(mapDtoToPost(postDto));
          setComments(commentsRes.items);
          setCursor(commentsRes.pageInfo.nextCursor ?? null);
          setHasNextPage(commentsRes.pageInfo.hasNextPage);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message =
            (err as { message?: string })?.message ||
            "This post is unavailable or does not exist.";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPost(false);
          setIsLoadingComments(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  const loadMoreComments = useCallback(async () => {
    if (!postId || !cursor) return;
    setIsLoadingComments(true);
    try {
      const res = await commentsService.getPostComments(postId, {
        cursor,
        limit: 20,
      });

      setComments((prev) => [...prev, ...res.items]);
      setCursor(res.pageInfo.nextCursor ?? null);
      setHasNextPage(res.pageInfo.hasNextPage);
    } catch {
      // Handle error
    } finally {
      setIsLoadingComments(false);
    }
  }, [postId, cursor]);

  const handlePostDeleted = () => {
    router.push("/feed");
  };

  const handleCreateCommentOrReply = async (content: string) => {
    setIsSubmittingComment(true);
    try {
      if (replyTarget) {
        // Create reply to comment thread
        await commentsService.createReply(replyTarget.id, content);
        // Refresh comments list or update replies
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
        const newComment = await commentsService.createComment(postId, content);
        setComments((prev) => [newComment, ...prev]);
        if (commentsTopRef.current) {
          commentsTopRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }

      setPost((prev) =>
        prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null,
      );
    } finally {
      setIsSubmittingComment(false);
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
    setPost((prev) =>
      prev
        ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) }
        : null,
    );
  };

  const handleUpdateComment = async (commentId: string, newContent: string) => {
    const updated = await commentsService.updateComment(commentId, newContent);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, ...updated } : c)),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="max-w-2xl mx-auto pb-20 select-none"
    >
      {/* Premium Sticky Header Bar */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 mb-5">
        <div className="flex items-center justify-between py-3 px-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white active:scale-95 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.06] group-hover:bg-white/[0.12] border border-white/10 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">Back</span>
          </button>

          <h2 className="text-sm font-extrabold text-white tracking-tight">
            Post
          </h2>

          <div className="w-8" />
        </div>
      </div>

      {/* Loading State — Premium Skeleton */}
      <AnimatePresence mode="wait">
        {isLoadingPost && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Post Skeleton */}
            <div className="rounded-3xl border border-white/10 bg-[#111728]/60 p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white/10" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-32 bg-white/10 rounded-full" />
                  <div className="h-2.5 w-24 bg-white/5 rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-white/10 rounded-full" />
                <div className="h-3 w-3/5 bg-white/10 rounded-full" />
              </div>
              <div className="h-64 w-full bg-white/5 rounded-2xl" />
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className="flex items-center gap-6">
                  <div className="h-5 w-14 bg-white/10 rounded-full" />
                  <div className="h-5 w-14 bg-white/10 rounded-full" />
                  <div className="h-5 w-14 bg-white/10 rounded-full" />
                </div>
                <div className="h-5 w-5 bg-white/10 rounded-full" />
              </div>
            </div>

            {/* Comments Skeleton */}
            <div className="rounded-3xl border border-white/10 bg-[#111728]/40 p-5 space-y-4 animate-pulse">
              <div className="h-4 w-28 bg-white/10 rounded-full" />
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-white/10 rounded-full" />
                    <div className="h-3 w-full bg-white/5 rounded-full" />
                    <div className="h-3 w-4/5 bg-white/5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error / Not Found State */}
      <AnimatePresence>
        {error && !isLoadingPost && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#111728]/80 to-[#070913]/90 p-10 text-center space-y-5 backdrop-blur-xl"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-white">
                Post Unavailable
              </h3>
              <p className="text-sm text-white/50 max-w-sm mx-auto leading-relaxed">
                {error}
              </p>
            </div>
            <Link
              href="/feed"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-bg-primary text-white text-xs font-bold shadow-lg shadow-purple-500/25 hover:opacity-90 active:scale-95 transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Feed</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Post + Discussion */}
      {post && !isLoadingPost && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
          className="space-y-5"
        >
          {/* The Post Card */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            <FeedPostCard post={post} onPostDeleted={handlePostDeleted} />
          </motion.div>

          {/* Engagement Summary Bar */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
            }}
            className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/[0.06] px-5 py-3"
          >
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-pink-400/80">
                <Heart className="h-4 w-4" />
                <span className="text-xs font-bold">
                  {formatNumber(post.likesCount)} likes
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-400/80">
                <Repeat2 className="h-4 w-4" />
                <span className="text-xs font-bold">
                  {formatNumber(post.repostsCount || 0)} reposts
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-400/80">
                <Share2 className="h-4 w-4" />
                <span className="text-xs font-bold">
                  {formatNumber(post.sharesCount)} shares
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-white/40">
              <Bookmark className="h-4 w-4" />
            </div>
          </motion.div>

          {/* ─── Discussion Thread Section ─── */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
            }}
            className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#111728]/70 to-[#0c101d]/80 backdrop-blur-xl overflow-hidden"
          >
            {/* Section Header */}
            <div
              ref={commentsTopRef}
              className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/25">
                  <MessageCircle className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Discussion
                  </h3>
                  <p className="text-[11px] text-white/40 font-medium">
                    {post.commentsCount === 0
                      ? "Be the first to comment"
                      : `${formatNumber(post.commentsCount)} comment${post.commentsCount !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Comment Composer Box — Top Position */}
            <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.015]">
              <CommentComposer
                placeholder={
                  replyTarget
                    ? `Reply to @${replyTarget.author?.username || "user"}...`
                    : "Write a comment..."
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
                isSubmitting={isSubmittingComment}
              />
            </div>

            {/* Comments List */}
            <div className="px-4 sm:px-5">
              {isLoadingComments && comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <span className="text-xs text-white/40 font-medium">
                    Loading comments...
                  </span>
                </div>
              ) : comments.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {comments.map((comment, idx) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: Math.min(idx * 0.04, 0.5),
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="py-3"
                    >
                      <CommentItem
                        comment={comment}
                        onReply={(c) => setReplyTarget(c)}
                        onDelete={handleDeleteComment}
                        onUpdate={handleUpdateComment}
                      />
                    </motion.div>
                  ))}

                  {hasNextPage && (
                    <div className="py-4 text-center">
                      <button
                        type="button"
                        onClick={loadMoreComments}
                        disabled={isLoadingComments}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-bold text-purple-300 hover:text-white transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {isLoadingComments ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            <span>Load more comments</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-14 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.1)]">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-white">
                      No comments yet
                    </p>
                    <p className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
                      Start the conversation — share your thoughts about this
                      post.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
