"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send, MapPin, Repeat2, Lock, Globe, Users } from "lucide-react";
import { Post } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { formatNumber } from "@/lib/utils";
import { CURRENT_USER } from "@/shared/services/mockData";
import { PostMedia } from "./PostMedia";
import { MediaViewerModal } from "./MediaViewerModal";
import { ShareSheet } from "./ShareSheet";
import { RepostModal } from "./RepostModal";
import { QuotePostCard } from "./QuotePostCard";

export const FeedPostCard: React.FC<{ post: Post }> = ({ post: initialPost }) => {
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRepostOpen, setIsRepostOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleLikeToggle = () => {
    setPost((prev) => {
      const nextLiked = !prev.isLiked;
      showToast(nextLiked ? "Post liked ❤️" : "Unliked post");
      return {
        ...prev,
        isLiked: nextLiked,
        likesCount: nextLiked ? prev.likesCount + 1 : prev.likesCount - 1,
      };
    });
  };

  const handleBookmarkToggle = () => {
    setPost((prev) => {
      const nextBookmarked = !prev.isBookmarked;
      // Also update initialPost object so Saved page picks it up immediately
      initialPost.isBookmarked = nextBookmarked;
      showToast(nextBookmarked ? "Saved to your bookmarks 🔖" : "Removed from saved posts");
      return {
        ...prev,
        isBookmarked: nextBookmarked,
      };
    });
  };

  const handleRepostAction = (quoteText?: string) => {
    setPost((prev) => ({
      ...prev,
      isReposted: true,
      repostsCount: (prev.repostsCount || 0) + 1,
    }));
    showToast(quoteText ? "Published quote post 💬" : "Reposted to your feed 🔁");
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: `c_${Date.now()}`,
      postId: post.id,
      user: CURRENT_USER,
      content: commentText.trim(),
      createdAt: "Just now",
      likesCount: 0,
    };

    setPost((prev) => ({
      ...prev,
      commentsCount: prev.commentsCount + 1,
      comments: [newComment, ...(prev.comments || [])],
    }));
    setCommentText("");
    showToast("Comment published 💬");
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
            className="font-bold text-purple-400 hover:underline hover:text-purple-300 inline-block"
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
            className="font-bold text-cyan-400 hover:underline hover:text-cyan-300 inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const renderAudienceIcon = () => {
    if (post.audience === "close_friends") {
      return <Lock className="h-3 w-3 text-pink-400" title="Close Friends" />;
    }
    if (post.audience === "friends") {
      return <Users className="h-3 w-3 text-purple-400" title="Friends Only" />;
    }
    return <Globe className="h-3 w-3 text-muted-foreground/60" title="Public" />;
  };

  return (
    <Card className="glass-panel border-white/10 p-4 sm:p-5 shadow-xl relative overflow-hidden">
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

      {/* Repost Header Attribution if Repost */}
      {post.isReposted && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5 pl-1 font-medium">
          <Repeat2 className="h-3.5 w-3.5 text-purple-400" />
          <span>You reposted</span>
        </div>
      )}

      {/* Post Header */}
      <div className="flex items-center justify-between mb-3">
        <Link href={`/profile/${post.user.username}`} className="flex items-center gap-3 group">
          <Avatar
            src={post.user.avatar}
            alt={post.user.displayName}
            size="md"
            isVerified={post.user.role === "verified"}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-sm text-foreground group-hover:text-purple-300 transition-colors">
                {post.user.displayName}
              </h4>
              {renderAudienceIcon()}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>@{post.user.username}</span>
              <span>•</span>
              <span>{post.createdAt}</span>
              {post.locationTag && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-purple-300">
                    <MapPin className="h-3 w-3" />
                    {post.locationTag}
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>
        <button
          aria-label="More options"
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Post Text Content */}
      <p className="text-sm leading-relaxed text-foreground mb-3.5 whitespace-pre-line">
        {renderFormattedContent(post.content)}
      </p>

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
      <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-muted-foreground text-xs">
        <div className="flex items-center gap-5 sm:gap-7">
          <button
            onClick={handleLikeToggle}
            aria-label="Like post"
            className={`flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
              post.isLiked ? "text-pink-500 font-bold" : "hover:text-foreground"
            }`}
          >
            <Heart className={`h-5 w-5 ${post.isLiked ? "fill-pink-500" : ""}`} />
            <span>{formatNumber(post.likesCount)}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            aria-label="Toggle comments"
            className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors cursor-pointer"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{formatNumber(post.commentsCount)}</span>
          </button>

          <button
            onClick={() => setIsRepostOpen(true)}
            aria-label="Repost"
            className={`flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
              post.isReposted ? "text-purple-400 font-bold" : "hover:text-foreground"
            }`}
          >
            <Repeat2 className="h-5 w-5" />
            <span>{formatNumber(post.repostsCount || 0)}</span>
          </button>

          <button
            onClick={() => setIsShareOpen(true)}
            aria-label="Share post"
            className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors cursor-pointer"
          >
            <Share2 className="h-5 w-5" />
            <span>{formatNumber(post.sharesCount)}</span>
          </button>
        </div>

        <button
          onClick={handleBookmarkToggle}
          aria-label="Save post"
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            post.isBookmarked ? "text-purple-400 font-bold" : "hover:text-foreground"
          }`}
        >
          <Bookmark className={`h-5 w-5 ${post.isBookmarked ? "fill-purple-400" : ""}`} />
        </button>
      </div>

      {/* Expandable Comments Drawer */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pt-4 border-t border-white/10 mt-3 space-y-3"
          >
            {/* Existing Comments List */}
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 text-xs glass-card p-3 rounded-xl border border-white/5">
                  <Avatar src={comment.user.avatar} alt={comment.user.displayName} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{comment.user.displayName}</span>
                      <span className="text-[10px] text-muted-foreground">{comment.createdAt}</span>
                    </div>
                    <p className="text-gray-300 mt-1">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first to reply!</p>
            )}

            {/* Comment Input Form */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2">
              <Input
                placeholder="Write a reply..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="h-10 text-xs"
              />
              <Button type="submit" size="sm" variant="gradient" className="h-10 px-4">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Media Viewer Modal */}
      <MediaViewerModal
        isOpen={isMediaViewerOpen}
        onClose={() => setIsMediaViewerOpen(false)}
        post={post}
        initialMediaIndex={activeMediaIndex || 0}
      />

      {/* Share Sheet */}
      <ShareSheet
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        post={post}
        onShowToast={showToast}
      />

      {/* Repost & Quote Modal */}
      <RepostModal
        isOpen={isRepostOpen}
        onClose={() => setIsRepostOpen(false)}
        post={post}
        onRepost={handleRepostAction}
      />
    </Card>
  );
};
