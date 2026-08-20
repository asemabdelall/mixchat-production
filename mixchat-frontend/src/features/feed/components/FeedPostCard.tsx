"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  MapPin,
  Repeat2,
  Lock,
  Globe,
  Users,
  Check,
} from "lucide-react";
import { Post } from "@/types";
import { formatNumber } from "@/lib/utils";
import { useAuth } from "@/shared/providers/AuthProvider";
import { postsService } from "@/services/feed/postsService";
import { PostMedia } from "./PostMedia";
import { MediaViewerModal } from "./MediaViewerModal";
import { ShareSheet } from "./ShareSheet";
import { RepostModal } from "./RepostModal";
import { QuotePostCard } from "./QuotePostCard";
import { CommentsBottomSheet } from "../../comments/components/CommentsBottomSheet";
import { getPostBackgroundTheme } from "../postBackgroundThemes";

interface FeedPostCardProps {
  post: Post;
  onPostDeleted?: (postId: string) => void;
  variant?: "feed" | "detail";
  onCommentRequested?: () => void;
  commentsCountOverride?: number;
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post: initialPost,
  onPostDeleted,
  variant = "feed",
  onCommentRequested,
  commentsCountOverride,
}) => {
  const { user } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRepostOpen, setIsRepostOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const backgroundTheme = getPostBackgroundTheme(post.backgroundTheme);
  const isDetail = variant === "detail";
  const displayedCommentsCount =
    commentsCountOverride ?? post.commentsCount;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleLikeToggle = async () => {
    const previousState = { ...post };
    const nextLiked = !post.isLiked;

    // Optimistic update
    setPost((prev) => ({
      ...prev,
      isLiked: nextLiked,
      likesCount: nextLiked
        ? prev.likesCount + 1
        : Math.max(0, prev.likesCount - 1),
    }));
    showToast(nextLiked ? "Post liked ❤️" : "Unliked post");

    try {
      if (nextLiked) {
        const res = await postsService.likePost(post.id);
        setPost((prev) => ({
          ...prev,
          likesCount: res.likesCount,
          isLiked: true,
        }));
      } else {
        const res = await postsService.unlikePost(post.id);
        setPost((prev) => ({
          ...prev,
          likesCount: res.likesCount,
          isLiked: false,
        }));
      }
    } catch {
      // Rollback on failure
      setPost(previousState);
      showToast("Could not update like status");
    }
  };

  const handleBookmarkToggle = async () => {
    const previousState = { ...post };
    const nextBookmarked = !post.isBookmarked;

    // Optimistic update
    setPost((prev) => ({
      ...prev,
      isBookmarked: nextBookmarked,
    }));
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
      // Rollback on failure
      setPost(previousState);
      showToast("Could not update bookmark status");
    }
  };

  const handleDeletePost = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await postsService.deletePost(post.id);
      showToast("Post deleted");
      onPostDeleted?.(post.id);
    } catch {
      showToast("Failed to delete post");
      setIsDeleting(false);
    }
  };

  const handleRepostAction = async () => {
    const previousState = { ...post };
    const nextReposted = !post.isReposted;
    setPost((prev) => ({
      ...prev,
      isReposted: nextReposted,
      repostsCount: nextReposted
        ? (prev.repostsCount || 0) + 1
        : Math.max(0, (prev.repostsCount || 0) - 1),
    }));

    try {
      const result = nextReposted
        ? await postsService.repostPost(post.id)
        : await postsService.unrepostPost(post.id);
      setPost((prev) => ({
        ...prev,
        isReposted: result.hasReposted,
        repostsCount: result.repostsCount,
      }));
      showToast(result.hasReposted ? "Post reposted 🔁" : "Repost removed");
    } catch (error) {
      setPost(previousState);
      throw error;
    }
  };

  const renderFormattedContent = (content: string) => {
    const parts = content.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        const tag = part.slice(1);
        return (
          <Link
            key={i}
            href={`/hashtag/${tag}`}
            className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 hover:underline inline-block mr-1"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Link
            key={i}
            href={`/profile/${username}`}
            className="font-bold text-cyan-400 hover:underline hover:text-cyan-300 inline-block mr-1"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const renderAudienceBadge = () => {
    if (post.audience === "close_friends") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-pink-400 bg-pink-500/15 px-2 py-0.5 rounded-full border border-pink-500/30">
          <Lock className="h-2.5 w-2.5" /> Close Friends
        </span>
      );
    }
    if (post.audience === "friends") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
          <Users className="h-2.5 w-2.5" /> Followers
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
        <Globe className="h-2.5 w-2.5" /> Public
      </span>
    );
  };

  return (
    <article
      className={`relative overflow-hidden bg-gradient-to-b from-[#111728]/90 via-[#0c101d]/95 to-[#070913]/95 shadow-2xl shadow-purple-950/20 select-none group ${
        isDetail
          ? "rounded-[1.75rem] p-4 sm:p-6 lg:p-7"
          : "rounded-3xl border border-white/10 p-4 transition-all duration-300 hover:border-purple-500/30 sm:p-5"
      }`}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-purple-600/90 text-white backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold shadow-lg border border-purple-400/40"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Repost Header Attribution */}
      {post.isReposted && (
        <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-3 pl-1 font-bold">
          <Repeat2 className="h-3.5 w-3.5 text-purple-400" />
          <span>You reposted</span>
        </div>
      )}

      {/* Post Header */}
      <div
        className={`flex items-center justify-between gap-3 ${isDetail ? "mb-5" : "mb-3.5"}`}
      >
        <Link
          href={`/profile/${post.user.username}`}
          className="flex items-center gap-3 min-w-0 flex-1 group/author"
        >
          {/* User Avatar */}
          <div className="relative shrink-0">
            <div
              className={`${isDetail ? "h-12 w-12 sm:h-14 sm:w-14" : "h-11 w-11"} rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-pink-500 shadow-md`}
            >
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
            <div className="flex items-center gap-1.5 truncate">
              <h4
                className={`${isDetail ? "text-base sm:text-lg" : "text-sm"} truncate font-bold text-white transition-colors group-hover/author:text-purple-300`}
              >
                {post.user.displayName}
              </h4>
              {post.user.role === "verified" && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white text-[8px] shrink-0">
                  <Check className="h-2 w-2 stroke-[3]" />
                </span>
              )}
            </div>

            <div
              className={`mt-0.5 flex flex-wrap items-center gap-1.5 text-white/50 ${isDetail ? "text-sm" : "text-xs"}`}
            >
              <span className="truncate max-w-[120px]">
                @{post.user.username}
              </span>
              <span className="text-white/30">•</span>
              <span className="whitespace-nowrap">{post.createdAt}</span>
              {post.locationTag && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="flex items-center gap-1 text-purple-300 font-medium whitespace-nowrap">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{post.locationTag}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>

        <div className="relative flex items-center gap-2 shrink-0">
          {renderAudienceBadge()}
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            aria-label="More options"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {/* Options Dropdown Menu */}
          {showMenu && (
            <div
              className="absolute right-0 top-8 z-30 min-w-[140px] rounded-2xl bg-[#111728]/95 border border-white/10 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/feed/${post.id}`,
                    );
                    showToast("Link copied to clipboard 📋");
                  }
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Copy Link</span>
              </button>

              {user?.id === post.userId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    void handleDeletePost();
                  }}
                  disabled={isDeleting}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{isDeleting ? "Deleting..." : "Delete Post"}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Text Content */}
      {post.content && (
        <div
          className={
            backgroundTheme
              ? `mb-4 flex min-h-56 items-center justify-center rounded-2xl p-6 text-center shadow-lg sm:min-h-64 sm:p-8 ${backgroundTheme.className}`
              : "mb-3.5"
          }
          data-post-background={backgroundTheme?.id}
        >
          <p
            dir="auto"
            className={
              backgroundTheme
                ? `max-w-xl whitespace-pre-line font-extrabold leading-relaxed text-white [overflow-wrap:anywhere] ${isDetail ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`
                : `whitespace-pre-line font-normal leading-relaxed text-white/90 [overflow-wrap:anywhere] ${isDetail ? "text-base sm:text-[17px]" : "text-[13.5px] sm:text-[14.5px]"}`
            }
          >
            {renderFormattedContent(post.content)}
          </p>
        </div>
      )}

      {/* Quoted Original Post Component */}
      {post.isRepost && post.originalPost && (
        <div className="mb-4">
          <QuotePostCard post={post.originalPost} />
        </div>
      )}

      {/* Media Renderer */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <PostMedia
          post={post}
          onOpenViewer={(idx) => {
            setActiveMediaIndex(idx);
            setIsMediaViewerOpen(true);
          }}
          onDoubleTapLike={handleLikeToggle}
        />
      )}

      {/* Post Actions Bar */}
      <div
        className={`flex items-center justify-between text-xs text-white/60 select-none ${isDetail ? "pt-5" : "pt-3"}`}
      >
        <div className={`flex items-center ${isDetail ? "gap-1 sm:gap-4" : "gap-3 sm:gap-6"}`}>
          {/* Like CTA */}
          <button
            onClick={handleLikeToggle}
            aria-label="Like post"
            aria-pressed={post.isLiked}
            className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 transition-colors hover:bg-white/5 active:bg-white/10 ${
              post.isLiked ? "text-pink-500 font-bold" : "hover:text-white"
            }`}
          >
            <Heart
              className={`h-5 w-5 transition-transform ${
                post.isLiked ? "fill-pink-500 text-pink-500 scale-110" : ""
              }`}
            />
            <span className="text-xs font-bold">
              {formatNumber(post.likesCount)}
            </span>
          </button>

          {/* Comment CTA */}
          <button
            onClick={() => {
              if (onCommentRequested) {
                onCommentRequested();
                return;
              }
              setShowComments(true);
            }}
            aria-label={onCommentRequested ? "Go to comments" : "Open comments"}
            className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 transition-colors hover:bg-white/5 active:bg-white/10 ${
              showComments ? "text-purple-400 font-bold" : "hover:text-white"
            }`}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs font-bold">
              {formatNumber(displayedCommentsCount)}
            </span>
          </button>

          {/* Repost CTA */}
          <button
            onClick={() => setIsRepostOpen(true)}
            aria-label="Repost"
            aria-pressed={post.isReposted}
            className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 transition-colors hover:bg-white/5 active:bg-white/10 ${
              post.isReposted ? "text-purple-400 font-bold" : "hover:text-white"
            }`}
          >
            <Repeat2 className="h-5 w-5" />
            <span className="text-xs font-bold">
              {formatNumber(post.repostsCount || 0)}
            </span>
          </button>

          {/* Share CTA */}
          <button
            onClick={() => setIsShareOpen(true)}
            aria-label="Share post"
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-white/60 transition-colors hover:bg-white/5 hover:text-white active:bg-white/10"
          >
            <Share2 className="h-5 w-5" />
            <span className="text-xs font-bold">
              {formatNumber(post.sharesCount)}
            </span>
          </button>
        </div>

        {/* Bookmark CTA */}
        <button
          onClick={handleBookmarkToggle}
          aria-label="Save post"
          aria-pressed={post.isBookmarked}
          className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/10 active:bg-white/15 ${
            post.isBookmarked
              ? "text-purple-400"
              : "text-white/60 hover:text-white"
          }`}
        >
          <Bookmark
            className={`h-5 w-5 ${post.isBookmarked ? "fill-purple-400" : ""}`}
          />
        </button>
      </div>

      {/* Real Full-Stack Comments Bottom Sheet / Drawer */}
      {!onCommentRequested && (
        <CommentsBottomSheet
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          postId={post.id}
          commentsCount={displayedCommentsCount}
          onCommentsCountChange={(newCount) => {
            setPost((prev) => ({ ...prev, commentsCount: newCount }));
          }}
        />
      )}

      {/* Modals */}
      <MediaViewerModal
        isOpen={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
        post={post}
        initialMediaIndex={activeMediaIndex || 0}
        onPostChange={setPost}
        onPostDeleted={onPostDeleted}
      />

      <ShareSheet
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        post={post}
        onShowToast={showToast}
      />

      <RepostModal
        isOpen={isRepostOpen}
        onClose={() => setIsRepostOpen(false)}
        post={post}
        onRepost={handleRepostAction}
      />
    </article>
  );
};
