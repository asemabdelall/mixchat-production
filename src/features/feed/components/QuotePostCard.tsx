"use client";

import React from "react";
import Link from "next/link";
import { Post } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";

export const QuotePostCard: React.FC<{ post: Post }> = ({ post }) => {
  return (
    <div className="rounded-xl border border-white/10 glass-card p-3.5 space-y-2 hover:border-purple-500/30 transition-colors bg-white/[0.02]">
      {/* Original Author */}
      <div className="flex items-center gap-2">
        <Avatar src={post.user.avatar} alt={post.user.displayName} size="sm" />
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Link
            href={`/profile/${post.user.username}`}
            className="font-bold text-xs text-foreground hover:text-purple-300 truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {post.user.displayName}
          </Link>
          <span className="text-[10px] text-muted-foreground truncate">@{post.user.username}</span>
          <span className="text-[10px] text-muted-foreground">• {post.createdAt}</span>
        </div>
      </div>

      {/* Content snippet */}
      <p className="text-xs text-foreground/90 line-clamp-3 leading-relaxed">{post.content}</p>

      {/* Thumbnail Media if present */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="rounded-lg overflow-hidden max-h-36 border border-white/10">
          <img src={post.mediaUrls[0]} alt="Quote Media" className="w-full h-full object-cover max-h-36" />
        </div>
      )}
    </div>
  );
};
