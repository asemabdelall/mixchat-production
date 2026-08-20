"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Post } from "@/types";
import { getPostBackgroundTheme } from "../postBackgroundThemes";

export const QuotePostCard: React.FC<{ post: Post }> = ({ post }) => {
  const backgroundTheme = getPostBackgroundTheme(post.backgroundTheme);

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/20 to-black/30 backdrop-blur-md p-3.5 space-y-2.5 hover:border-purple-500/40 transition-all border-l-4 border-l-purple-500 select-none">
      {/* Original Author */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full overflow-hidden bg-white/5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.user.avatar}
            alt={post.user.displayName}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Link
            href={`/profile/${post.user.username}`}
            className="font-bold text-xs text-white hover:text-purple-300 truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {post.user.displayName}
          </Link>
          {post.user.role === "verified" && (
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 text-white text-[7px] shrink-0">
              <Check className="h-1.5 w-1.5 stroke-[3]" />
            </span>
          )}
          <span className="text-[11px] text-white/40 truncate">
            @{post.user.username}
          </span>
          <span className="text-[11px] text-white/30">• {post.createdAt}</span>
        </div>
      </div>

      {/* Content snippet */}
      <div
        className={
          backgroundTheme
            ? `flex min-h-32 items-center justify-center rounded-xl p-4 text-center ${backgroundTheme.className}`
            : ""
        }
      >
        <p
          className={
            backgroundTheme
              ? "line-clamp-4 text-base font-extrabold leading-relaxed text-white"
              : "line-clamp-3 text-xs leading-relaxed text-white/85"
          }
        >
          {post.content}
        </p>
      </div>

      {/* Thumbnail Media if present */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="rounded-xl overflow-hidden max-h-40 border border-white/10 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.mediaUrls[0]}
            alt="Quote Media"
            className="w-full h-full object-cover max-h-40"
          />
        </div>
      )}
    </div>
  );
};
