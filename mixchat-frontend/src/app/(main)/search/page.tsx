"use client";

import React, { Suspense } from "react";
import { UniversalSearch } from "@/features/search/components/UniversalSearch";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto w-full max-w-6xl space-y-7 pb-12"
          aria-label="Loading search"
        >
          <div className="space-y-2">
            <div className="h-8 w-32 animate-pulse rounded-full bg-white/8" />
            <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-white/5" />
          </div>
          <div className="h-14 animate-pulse rounded-[1.35rem] bg-white/[0.055]" />
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="col-span-2 aspect-square animate-pulse rounded-3xl bg-white/[0.055]" />
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="aspect-square animate-pulse rounded-2xl bg-white/[0.045]"
                />
              ))}
            </div>
            <div className="hidden h-80 animate-pulse rounded-3xl bg-white/[0.04] lg:block" />
          </div>
        </div>
      }
    >
      <UniversalSearch />
    </Suspense>
  );
}
