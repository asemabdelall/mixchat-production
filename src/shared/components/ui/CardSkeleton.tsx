"use client";

import React from "react";
import { Skeleton } from "./Skeleton";

export const FeedPostSkeleton: React.FC = () => {
  return (
    <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
};

export const ChatItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl glass-card border border-white/5 animate-pulse">
      <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-12" />
        </div>
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
};

export const ProfileHeaderSkeleton: React.FC = () => {
  return (
    <div className="glass-panel rounded-3xl border border-white/10 p-6 space-y-4 animate-pulse">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="flex items-end justify-between -mt-12 px-4">
        <Skeleton className="h-20 w-20 rounded-full border-4 border-[#090d18]" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </div>
  );
};
