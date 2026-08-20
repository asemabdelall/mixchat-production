"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  MessageCircle,
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
  const shouldReduceMotion = useReducedMotion();

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

  const focusDiscussion = useCallback(() => {
    commentsTopRef.current?.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "start",
    });

    window.requestAnimationFrame(() => {
      commentsTopRef.current?.parentElement
        ?.querySelector<HTMLInputElement>('input[type="text"]')
        ?.focus();
    });
  }, [shouldReduceMotion]);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative mx-auto max-w-6xl pb-20 select-auto"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] overflow-hidden"
      >
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute -right-24 top-52 h-72 w-72 rounded-full bg-blue-500/[0.08] blur-3xl" />
      </div>

      {/* Contextual page header */}
      <header className="sticky top-0 z-20 -mx-3 mb-5 bg-gradient-to-b from-background via-background/95 to-background/0 px-3 pb-4 pt-1 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:mb-7 lg:px-8">
        <div className="grid min-h-12 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="group flex min-h-11 w-fit cursor-pointer items-center gap-2 justify-self-start rounded-full pr-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white active:bg-white/10"
            aria-label="Go back"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] transition-colors group-hover:bg-white/[0.1]">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="min-w-0 text-center">
            <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
              Post
            </h1>
            <p className="hidden text-xs font-medium text-white/45 sm:block">
              View the post and join the conversation
            </p>
          </div>

          <div className="flex min-w-11 justify-end justify-self-end" aria-hidden="true">
            {post && !isLoadingPost && (
              <span className="rounded-full bg-purple-500/10 px-3 py-1.5 text-xs font-bold tabular-nums text-purple-300">
                {formatNumber(post.commentsCount)} comments
              </span>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {isLoadingPost && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:items-start lg:gap-7"
            aria-label="Loading post"
          >
            <div className="animate-pulse space-y-5 rounded-[1.75rem] bg-[#111728]/70 p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-36 rounded-full bg-white/10" />
                  <div className="h-3 w-28 rounded-full bg-white/5" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full rounded-full bg-white/10" />
                <div className="h-4 w-3/5 rounded-full bg-white/10" />
              </div>
              <div className="aspect-[4/3] w-full rounded-2xl bg-white/[0.05]" />
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-5">
                  <div className="h-10 w-14 rounded-xl bg-white/[0.07]" />
                  <div className="h-10 w-14 rounded-xl bg-white/[0.07]" />
                  <div className="h-10 w-14 rounded-xl bg-white/[0.07]" />
                </div>
                <div className="h-11 w-11 rounded-full bg-white/[0.07]" />
              </div>
            </div>

            <div className="animate-pulse space-y-4 rounded-[1.75rem] bg-[#0d1322]/80 p-5 sm:p-6">
              <div className="h-12 w-full rounded-2xl bg-white/[0.06]" />
              <div className="h-24 w-full rounded-2xl bg-purple-500/[0.06]" />
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="flex items-start gap-3 rounded-2xl bg-white/[0.025] p-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 rounded-full bg-white/10" />
                    <div className="h-3 w-full rounded-full bg-white/5" />
                    <div className="h-3 w-4/5 rounded-full bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && !isLoadingPost && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mx-auto max-w-xl space-y-5 rounded-[1.75rem] bg-gradient-to-b from-[#111728]/90 to-[#070913]/95 p-8 text-center shadow-2xl shadow-black/20 sm:p-12"
            role="alert"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.12)]">
              <AlertCircle className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white">
                Post Unavailable
              </h2>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/60">
                {error}
              </p>
            </div>
            <Link
              href="/feed"
              className="gradient-bg-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-opacity hover:opacity-90 active:opacity-80"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Return to Feed</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {post && !isLoadingPost && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] lg:items-start lg:gap-7">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
          >
            <FeedPostCard
              post={post}
              variant="detail"
              commentsCountOverride={post.commentsCount}
              onCommentRequested={focusDiscussion}
              onPostDeleted={handlePostDeleted}
            />
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: shouldReduceMotion ? 0 : 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="scroll-mt-24 overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-[#101727]/90 to-[#090e19]/95 shadow-2xl shadow-black/20 lg:sticky lg:top-24"
          >
            <div
              ref={commentsTopRef}
              className="flex items-center justify-between gap-4 px-5 pb-3 pt-5 sm:px-6 sm:pt-6"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300 shadow-[0_0_24px_rgba(168,85,247,0.12)]">
                  <MessageCircle
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white sm:text-lg">
                    Conversation
                  </h2>
                  <p
                    className="text-xs font-medium text-white/55"
                    aria-live="polite"
                  >
                    {post.commentsCount === 0
                      ? "Be the first to respond"
                      : `${formatNumber(post.commentsCount)} response${post.commentsCount !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              {comments.length > 0 && (
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-bold tabular-nums text-white/60">
                  {formatNumber(comments.length)} shown
                </span>
              )}
            </div>

            <div className="mx-3 mb-3 rounded-2xl bg-purple-500/[0.065] p-3 sm:mx-4 sm:mb-4 sm:p-4">
              <CommentComposer
                placeholder={
                  replyTarget
                    ? `Reply to @${replyTarget.author?.username || "user"}...`
                    : "Add to the conversation..."
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

            <div className="px-3 pb-4 sm:px-4 sm:pb-5">
              {isLoadingComments && comments.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 py-16"
                  aria-live="polite"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                  <span className="text-sm font-medium text-white/50">
                    Loading conversation...
                  </span>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-2.5">
                  {comments.map((comment, idx) => (
                    <motion.div
                      key={comment.id}
                      initial={
                        shouldReduceMotion ? false : { opacity: 0, y: 10 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.28,
                        delay: shouldReduceMotion
                          ? 0
                          : Math.min(idx * 0.035, 0.35),
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="rounded-2xl bg-white/[0.025] p-1.5 transition-colors hover:bg-white/[0.045] sm:p-2"
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
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={loadMoreComments}
                        disabled={isLoadingComments}
                        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white/[0.05] px-5 py-2.5 text-sm font-bold text-purple-300 transition-colors hover:bg-white/[0.09] hover:text-white active:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isLoadingComments ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            <span>Show more comments</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4 px-4 py-14">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.1)]">
                    <Sparkles className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <h3 className="text-base font-bold text-white">
                      Start the conversation
                    </h3>
                    <p className="mx-auto max-w-xs text-sm leading-relaxed text-white/55">
                      Share a thought, ask a question, or leave a reaction for
                      the author.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
