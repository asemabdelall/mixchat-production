"use client";

import React, { Suspense } from "react";
import { UniversalSearch } from "@/features/search/components/UniversalSearch";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-muted-foreground text-xs">
          Loading search...
        </div>
      }
    >
      <UniversalSearch />
    </Suspense>
  );
}
