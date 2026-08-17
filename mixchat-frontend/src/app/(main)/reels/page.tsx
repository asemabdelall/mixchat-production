"use client";

import React, { Suspense } from "react";
import { ReelFeedViewer } from "@/features/reels/components/ReelFeedViewer";

export default function ReelsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] w-full bg-black flex items-center justify-center text-white text-xs">
          Loading Reels...
        </div>
      }
    >
      <ReelFeedViewer />
    </Suspense>
  );
}
