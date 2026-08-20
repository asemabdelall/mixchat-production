"use client";

import React from "react";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";
import { Message } from "@/types";

interface ChatSearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  matchingMessages: Message[];
  currentMatchIndex: number;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  onClose: () => void;
}

export const ChatSearchBar: React.FC<ChatSearchBarProps> = ({
  searchQuery,
  onSearchQueryChange,
  matchingMessages,
  currentMatchIndex,
  onPrevMatch,
  onNextMatch,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 bg-purple-500/[0.08] px-2.5 py-2 sm:px-4">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Search messages"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-11 w-full rounded-2xl bg-black/20 pl-10 pr-3 text-base text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-purple-400/70"
          autoFocus
        />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="hidden text-xs font-semibold tabular-nums text-purple-200 sm:inline">
          {matchingMessages.length > 0
            ? `${currentMatchIndex + 1} of ${matchingMessages.length}`
            : "No matches"}
        </span>

        {matchingMessages.length > 0 && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onPrevMatch}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
              title="Previous match"
              aria-label="Previous match"
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNextMatch}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
              title="Next match"
              aria-label="Next match"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
          title="Close search"
          aria-label="Close search"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
