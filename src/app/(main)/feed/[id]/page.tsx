"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, Share2, Send, MoreHorizontal } from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Card } from "@/shared/components/ui/Card";
import { MOCK_POSTS, CURRENT_USER } from "@/shared/services/mockData";
import { formatNumber } from "@/lib/utils";

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const initialPost = MOCK_POSTS.find((p) => p.id === postId) || MOCK_POSTS[0];

  const [post, setPost] = useState(initialPost);
  const [commentText, setCommentText] = useState("");

  const handleLike = () => {
    setPost((prev) => ({
      ...prev,
      isLiked: !prev.isLiked,
      likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1,
    }));
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
      comments: [...(prev.comments || []), newComment],
    }));
    setCommentText("");
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Feed</span>
        </Link>
        <span className="text-xs font-semibold text-purple-300">Post Details</span>
        <button className="text-muted-foreground hover:text-white">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Main Post Card */}
      <Card className="glass-panel border-white/10 p-5 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Avatar src={post.user.avatar} alt={post.user.displayName} size="md" isVerified={post.user.role === "verified"} />
          <div>
            <h3 className="font-bold text-sm text-white">{post.user.displayName}</h3>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>@{post.user.username}</span>
              <span>•</span>
              <span>{post.createdAt}</span>
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-foreground mb-4 whitespace-pre-line">{post.content}</p>

        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="rounded-2xl overflow-hidden mb-4 border border-white/10">
            {post.mediaUrls.map((url, idx) => (
              <img key={idx} src={url} alt="Media" className="w-full max-h-[500px] object-cover" />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-muted-foreground">
          <div className="flex items-center gap-6">
            <button onClick={handleLike} className={`flex items-center gap-1.5 ${post.isLiked ? "text-pink-500 font-bold" : ""}`}>
              <Heart className={`h-5 w-5 ${post.isLiked ? "fill-pink-500" : ""}`} />
              <span>{formatNumber(post.likesCount)}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-5 w-5" />
              <span>{formatNumber(post.commentsCount)}</span>
            </div>
            <button className="flex items-center gap-1.5">
              <Share2 className="h-5 w-5" />
              <span>{formatNumber(post.sharesCount)}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Comments Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
          Comments ({post.commentsCount})
        </h4>

        <div className="space-y-3">
          {post.comments?.map((comment) => (
            <div key={comment.id} className="glass-panel p-4 rounded-2xl border border-white/10 flex gap-3 text-xs">
              <Avatar src={comment.user.avatar} alt={comment.user.displayName} size="sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{comment.user.displayName}</span>
                  <span className="text-[10px] text-muted-foreground">{comment.createdAt}</span>
                </div>
                <p className="text-gray-300 mt-1">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Comment Bar */}
      <form onSubmit={handleAddComment} className="fixed bottom-16 lg:bottom-4 left-0 right-0 max-w-xl mx-auto px-4 z-30">
        <div className="glass-panel p-2 rounded-2xl border border-white/15 shadow-2xl flex items-center gap-2 backdrop-blur-xl">
          <Avatar src={CURRENT_USER.avatar} alt={CURRENT_USER.displayName} size="sm" />
          <Input
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="h-10 text-xs flex-1"
          />
          <Button type="submit" size="sm" variant="gradient" className="h-10 px-4">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
