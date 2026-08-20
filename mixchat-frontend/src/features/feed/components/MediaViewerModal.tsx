"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Repeat2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  MoreHorizontal,
  MapPin,
  Check,
  Loader2,
  Trash2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Post } from "@/types";
import { formatNumber } from "@/lib/utils";
import { useAuth } from "@/shared/providers/AuthProvider";
import { postsService } from "@/services/feed/postsService";
import {
  CommentDto,
  commentsService,
} from "@/services/comments/commentsService";
import { CommentItem } from "@/features/comments/components/CommentItem";
import { CommentComposer } from "@/features/comments/components/CommentComposer";

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  initialMediaIndex?: number;
  onPostChange?: (post: Post) => void;
  onPostDeleted?: (postId: string) => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  onClose,
  post: initialPost,
  initialMediaIndex = 0,
  onPostChange,
  onPostDeleted,
}) => {
  const { user } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [currentIndex, setCurrentIndex] = useState(initialMediaIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const mediaList = post.mediaUrls || [];
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsScrollRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingCommentsRef = useRef(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [mediaRetryKey, setMediaRetryKey] = useState(0);
  const [isMutatingPost, setIsMutatingPost] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Comments state
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState(false);
  const [commentsCursor, setCommentsCursor] = useState<string | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [replyTarget, setReplyTarget] = useState<CommentDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const commitPost = useCallback(
    (updater: (current: Post) => Post) => {
      setPost((current) => {
        const next = updater(current);
        onPostChange?.(next);
        return next;
      });
    },
    [onPostChange],
  );

  // Reset index when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const frameId = window.requestAnimationFrame(() => {
      const safeIndex = Math.min(
        Math.max(initialMediaIndex, 0),
        Math.max(mediaList.length - 1, 0),
      );
      setCurrentIndex(safeIndex);
      setShowMenu(false);
      setReplyTarget(null);
      setMediaError(false);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, initialMediaIndex, mediaList.length]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const loadComments = useCallback(
    async (cursor?: string) => {
      if (!post.id || isLoadingCommentsRef.current) return;
      isLoadingCommentsRef.current = true;
      if (!cursor) {
        setComments([]);
        setCommentsCursor(null);
        setHasMoreComments(false);
      }
      setIsLoadingComments(true);
      setCommentsError(false);
      try {
        const res = await commentsService.getPostComments(post.id, {
          cursor,
          limit: 20,
        });
        setComments((previous) =>
          cursor ? [...previous, ...res.items] : res.items,
        );
        setCommentsCursor(res.pageInfo.nextCursor ?? null);
        setHasMoreComments(res.pageInfo.hasNextPage);
      } catch {
        setCommentsError(true);
      } finally {
        isLoadingCommentsRef.current = false;
        setIsLoadingComments(false);
      }
    },
    [post.id],
  );

  // Load comments when modal opens
  useEffect(() => {
    if (!isOpen || !post.id) return;
    const frameId = window.requestAnimationFrame(() => void loadComments());
    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, post.id, loadComments]);

  const selectMedia = useCallback((index: number) => {
    setMediaError(false);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setCurrentIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        if (showMenu) setShowMenu(false);
        else onClose();
      }
      const target = e.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;
      if (e.key === "ArrowRight" && currentIndex < mediaList.length - 1) {
        selectMedia(currentIndex + 1);
      }
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        selectMedia(currentIndex - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, mediaList.length, onClose, selectMedia, showMenu]);

  // Like toggle
  const handleLikeToggle = useCallback(async () => {
    if (isMutatingPost) return;
    setIsMutatingPost(true);
    const prev = { ...post };
    const nextLiked = !post.isLiked;
    commitPost((p) => ({
      ...p,
      isLiked: nextLiked,
      likesCount: nextLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
    }));

    try {
      if (nextLiked) {
        const res = await postsService.likePost(post.id);
        commitPost((p) => ({
          ...p,
          likesCount: res.likesCount,
          isLiked: true,
        }));
      } else {
        const res = await postsService.unlikePost(post.id);
        commitPost((p) => ({
          ...p,
          likesCount: res.likesCount,
          isLiked: false,
        }));
      }
    } catch {
      commitPost(() => prev);
      showToast("Could not update like status");
    } finally {
      setIsMutatingPost(false);
    }
  }, [commitPost, isMutatingPost, post, showToast]);

  // Bookmark toggle
  const handleBookmarkToggle = useCallback(async () => {
    if (isMutatingPost) return;
    setIsMutatingPost(true);
    const prev = { ...post };
    const nextBookmarked = !post.isBookmarked;
    commitPost((p) => ({ ...p, isBookmarked: nextBookmarked }));
    showToast(
      nextBookmarked ? "Saved to bookmarks 🔖" : "Removed from bookmarks",
    );

    try {
      if (nextBookmarked) {
        await postsService.bookmarkPost(post.id);
      } else {
        await postsService.unbookmarkPost(post.id);
      }
    } catch {
      commitPost(() => prev);
      showToast("Could not update bookmark status");
    } finally {
      setIsMutatingPost(false);
    }
  }, [commitPost, isMutatingPost, post, showToast]);

  const handleRepostToggle = useCallback(async () => {
    if (isMutatingPost) return;
    setIsMutatingPost(true);
    const previousState = { ...post };
    const nextReposted = !post.isReposted;
    commitPost((current) => ({
      ...current,
      isReposted: nextReposted,
      repostsCount: nextReposted
        ? (current.repostsCount || 0) + 1
        : Math.max(0, (current.repostsCount || 0) - 1),
    }));

    try {
      const result = nextReposted
        ? await postsService.repostPost(post.id)
        : await postsService.unrepostPost(post.id);
      commitPost((current) => ({
        ...current,
        isReposted: result.hasReposted,
        repostsCount: result.repostsCount,
      }));
      showToast(result.hasReposted ? "Post reposted 🔁" : "Repost removed");
    } catch {
      commitPost(() => previousState);
      showToast("Could not update repost status");
    } finally {
      setIsMutatingPost(false);
    }
  }, [commitPost, isMutatingPost, post, showToast]);

  // Submit comment
  const handleSubmitComment = async (content: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (replyTarget) {
        await commentsService.createReply(replyTarget.id, content);
        const rootId =
          replyTarget.parentId === null
            ? replyTarget.id
            : replyTarget.rootId || replyTarget.id;
        setComments((items) =>
          items.map((item) =>
            item.id === rootId
              ? {
                  ...item,
                  stats: {
                    ...item.stats,
                    repliesCount: item.stats.repliesCount + 1,
                  },
                }
              : item,
          ),
        );
        setReplyTarget(null);
        showToast("Reply posted ✨");
      } else {
        const newComment = await commentsService.createComment(
          post.id,
          content,
        );
        setComments((prev) => [newComment, ...prev]);
        commentsScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        showToast("Comment posted ✨");
      }
      commitPost((p) => ({ ...p, commentsCount: p.commentsCount + 1 }));
    } catch {
      showToast(
        replyTarget ? "Failed to post reply" : "Failed to post comment",
      );
      throw new Error("Comment submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await commentsService.deleteComment(commentId);
    setComments((items) =>
      items.map((item) =>
        item.id === commentId
          ? {
              ...item,
              isDeleted: true,
              author: null,
              content: null,
            }
          : item,
      ),
    );
    commitPost((p) => ({
      ...p,
      commentsCount: Math.max(0, p.commentsCount - 1),
    }));
    showToast("Comment deleted");
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    const updated = await commentsService.updateComment(commentId, content);
    setComments((items) =>
      items.map((item) =>
        item.id === commentId ? { ...item, ...updated } : item,
      ),
    );
    showToast("Comment updated");
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/feed/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by @${post.user.username}`,
          text: post.content,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast("Link copied 📋");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast("Could not share this post");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/feed/${post.id}`,
      );
      showToast("Link copied 📋");
    } catch {
      showToast("Could not copy the link");
    }
    setShowMenu(false);
  };

  const handleDeletePost = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await postsService.deletePost(post.id);
      onPostDeleted?.(post.id);
      onClose();
    } catch {
      showToast("Failed to delete post");
      setIsDeleting(false);
    }
  };

  const handleTogglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch {
      setIsPlaying(false);
    }
  };

  // Double-tap like on image
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const handleDoubleTap = () => {
    if (!post.isLiked) {
      void handleLikeToggle();
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 900);
  };

  if (!isOpen || mediaList.length === 0) return null;

  const currentUrl = mediaList[currentIndex];
  const currentMediaKind = post.mediaItems?.[currentIndex]?.kind;
  const isVideo =
    currentMediaKind === "VIDEO" ||
    (!currentMediaKind &&
      (currentUrl === post.videoUrl ||
        (mediaList.length === 1 && post.mediaType === "video")));

  const renderFormattedContent = (content: string) => {
    const parts = content.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        return (
          <span
            key={i}
            className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith("@")) {
        return (
          <Link
            key={i}
            href={`/profile/${part.slice(1)}`}
            className="font-bold text-cyan-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-2xl"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Media from ${post.user.displayName}`}
        >
          {/* Toast */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] bg-purple-600/90 text-white backdrop-blur-md px-5 py-2 rounded-full text-xs font-bold shadow-2xl border border-purple-400/40"
              >
                {toastMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-[10000] p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer active:scale-90 backdrop-blur-md border border-white/10"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Main Content Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) =>
              e.stopPropagation()
            }
            className="relative w-full max-w-7xl h-[95vh] sm:h-[92vh] flex flex-col lg:flex-row overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border border-white/[0.08] shadow-2xl"
          >
            {/* ═══ LEFT: Media Viewport ═══ */}
            <div
              className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[280px] lg:min-h-full select-none"
              onDoubleClick={handleDoubleTap}
            >
              {isVideo ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    key={`${currentUrl}-${mediaRetryKey}`}
                    ref={videoRef}
                    src={currentUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    controls={false}
                    playsInline
                    onClick={() => void handleTogglePlayback()}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onLoadedMetadata={(event) =>
                      setVideoDuration(event.currentTarget.duration || 0)
                    }
                    onTimeUpdate={(event) =>
                      setVideoCurrentTime(event.currentTarget.currentTime)
                    }
                    onError={() => setMediaError(true)}
                    className="max-h-full w-full object-contain"
                  />
                  {/* Video Controls Bar */}
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-3 bg-black/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10">
                    <button
                      onClick={() => void handleTogglePlayback()}
                      aria-label={isPlaying ? "Pause video" : "Play video"}
                      className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || 0}
                      step="0.1"
                      value={Math.min(videoCurrentTime, videoDuration || 0)}
                      onChange={(event) => {
                        const nextTime = Number(event.target.value);
                        if (videoRef.current)
                          videoRef.current.currentTime = nextTime;
                        setVideoCurrentTime(nextTime);
                      }}
                      aria-label="Video progress"
                      className="min-w-0 flex-1 accent-purple-500 cursor-pointer"
                    />
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      aria-label={isMuted ? "Unmute video" : "Mute video"}
                      className="p-1.5 rounded-full text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={`${currentUrl}-${mediaRetryKey}`}
                  src={currentUrl}
                  alt={`Media ${currentIndex + 1}`}
                  onError={() => setMediaError(true)}
                  className="max-h-full w-full object-contain select-none"
                  draggable={false}
                />
              )}

              {mediaError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#070913] text-center px-6">
                  <MessageCircle className="h-9 w-9 text-white/20" />
                  <p className="text-sm font-semibold text-white/70">
                    This media could not be loaded.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaError(false);
                      setMediaRetryKey((key) => key + 1);
                      if (videoRef.current) videoRef.current.load();
                    }}
                    className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Double-Tap Heart Burst */}
              <AnimatePresence>
                {showHeartBurst && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.2 }}
                    animate={{ opacity: 1, scale: 1.1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                  >
                    <Heart className="h-28 w-28 fill-pink-500 text-pink-500 drop-shadow-[0_0_40px_rgba(236,72,153,0.8)]" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Carousel Navigation Arrows */}
              {mediaList.length > 1 && (
                <>
                  {currentIndex > 0 && (
                    <button
                      onClick={() => selectMedia(currentIndex - 1)}
                      aria-label="Previous"
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer active:scale-90 border border-white/10"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  {currentIndex < mediaList.length - 1 && (
                    <button
                      onClick={() => selectMedia(currentIndex + 1)}
                      aria-label="Next"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer active:scale-90 border border-white/10"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}

                  {/* Pagination dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    {mediaList.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectMedia(idx)}
                        aria-label={`View media ${idx + 1}`}
                        aria-current={idx === currentIndex ? "true" : undefined}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          idx === currentIndex
                            ? "w-5 bg-gradient-to-r from-purple-400 to-pink-400"
                            : "w-2 bg-white/40 hover:bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Counter badge (top-right) */}
              {mediaList.length > 1 && (
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs font-bold text-white">
                  {currentIndex + 1} / {mediaList.length}
                </div>
              )}
            </div>

            {/* ═══ RIGHT: Post Details Sidebar ═══ */}
            <div className="w-full lg:w-[400px] xl:w-[420px] flex flex-col bg-gradient-to-b from-[#0f1422] to-[#0a0e18] overflow-hidden">
              {/* Author Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06]">
                <Link
                  href={`/profile/${post.user.username}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group"
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-pink-500 shadow-lg">
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#070913]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.user.avatar}
                          alt={post.user.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors truncate">
                        {post.user.displayName}
                      </h4>
                      {post.user.role === "verified" && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-[8px] shrink-0">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/50 mt-0.5">
                      <span className="truncate">@{post.user.username}</span>
                      <span className="text-white/30">•</span>
                      <span className="whitespace-nowrap">
                        {post.createdAt}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMenu((visible) => !visible)}
                    aria-label="More post options"
                    aria-expanded={showMenu}
                    className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-10 z-40 min-w-44 rounded-2xl border border-white/10 bg-[#141927]/95 p-1.5 shadow-2xl backdrop-blur-xl">
                      <Link
                        href={`/feed/${post.id}`}
                        onClick={onClose}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View post
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleCopyLink()}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy link
                      </button>
                      {user?.id === post.userId && (
                        <button
                          type="button"
                          onClick={() => void handleDeletePost()}
                          disabled={isDeleting}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          {isDeleting ? "Deleting..." : "Delete post"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <p className="text-[14px] leading-relaxed text-white/90 whitespace-pre-line">
                  {renderFormattedContent(post.content)}
                </p>
                {post.locationTag && (
                  <div className="flex items-center gap-1.5 mt-2.5 text-xs text-purple-300 font-medium">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{post.locationTag}</span>
                  </div>
                )}
              </div>

              {/* ── Engagement Stats Row ── */}
              <div className="flex items-center gap-5 px-5 py-3 border-b border-white/[0.06] text-xs text-white/50">
                <span className="font-bold">
                  <span className="text-white">
                    {formatNumber(post.likesCount)}
                  </span>{" "}
                  likes
                </span>
                <span className="font-bold">
                  <span className="text-white">
                    {formatNumber(post.commentsCount)}
                  </span>{" "}
                  comments
                </span>
                <span className="font-bold">
                  <span className="text-white">
                    {formatNumber(post.repostsCount || 0)}
                  </span>{" "}
                  reposts
                </span>
              </div>

              {/* ── Action Buttons Bar ── */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-1">
                  {/* Like */}
                  <button
                    onClick={handleLikeToggle}
                    aria-label="Like"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer active:scale-90 ${
                      post.isLiked
                        ? "text-pink-500 bg-pink-500/10"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Heart
                      className={`h-[22px] w-[22px] transition-transform ${post.isLiked ? "fill-pink-500 scale-110" : ""}`}
                    />
                  </button>

                  {/* Comment */}
                  <button
                    onClick={() =>
                      document
                        .querySelector<HTMLInputElement>(
                          "#modal-comment-composer input",
                        )
                        ?.focus()
                    }
                    aria-label="Comment"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer active:scale-90"
                  >
                    <MessageCircle className="h-[22px] w-[22px]" />
                  </button>

                  {/* Share */}
                  <button
                    onClick={() => void handleShare()}
                    aria-label="Share"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer active:scale-90"
                  >
                    <Share2 className="h-[22px] w-[22px]" />
                  </button>

                  {/* Repost */}
                  <button
                    onClick={() => void handleRepostToggle()}
                    aria-label="Repost"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer active:scale-90 ${
                      post.isReposted
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Repeat2 className="h-[22px] w-[22px]" />
                  </button>
                </div>

                {/* Bookmark */}
                <button
                  onClick={handleBookmarkToggle}
                  aria-label="Save"
                  className={`p-2 rounded-xl transition-all cursor-pointer active:scale-90 ${
                    post.isBookmarked
                      ? "text-purple-400 bg-purple-500/10"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Bookmark
                    className={`h-[22px] w-[22px] ${post.isBookmarked ? "fill-purple-400" : ""}`}
                  />
                </button>
              </div>

              {/* ── Comments Section ── */}
              <div
                ref={commentsScrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar px-5 py-3 space-y-4 min-h-0"
              >
                {isLoadingComments && comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                    <span className="text-[11px] text-white/40">
                      Loading comments...
                    </span>
                  </div>
                ) : commentsError && comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <p className="text-xs text-white/50">
                      Could not load comments.
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadComments()}
                      className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-white/15 transition-colors cursor-pointer"
                    >
                      Try again
                    </button>
                  </div>
                ) : comments.length > 0 ? (
                  <>
                    <div className="space-y-1">
                      {comments.map((comment) => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          onReply={setReplyTarget}
                          onDelete={handleDeleteComment}
                          onUpdate={handleUpdateComment}
                        />
                      ))}
                    </div>
                    {hasMoreComments && (
                      <div className="pb-1 pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (commentsCursor)
                              void loadComments(commentsCursor);
                          }}
                          disabled={isLoadingComments}
                          className="rounded-xl bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-purple-300 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {isLoadingComments
                            ? "Loading..."
                            : "Load more comments"}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                    <MessageCircle className="h-8 w-8 text-white/10" />
                    <p className="text-xs text-white/40 font-medium">
                      No comments yet
                    </p>
                    <p className="text-[11px] text-white/25">
                      Be the first to share your thoughts
                    </p>
                  </div>
                )}
              </div>

              {/* ── Comment Input ── */}
              <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0a0e18]/80 backdrop-blur-md">
                <div id="modal-comment-composer">
                  <CommentComposer
                    placeholder={
                      replyTarget
                        ? `Reply to @${replyTarget.author?.username || "user"}...`
                        : "Add a comment..."
                    }
                    replyingTo={
                      replyTarget?.author
                        ? {
                            id: replyTarget.id,
                            username: replyTarget.author.username,
                            displayName: replyTarget.author.displayName,
                          }
                        : null
                    }
                    onCancelReply={() => setReplyTarget(null)}
                    onSubmit={handleSubmitComment}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
};
