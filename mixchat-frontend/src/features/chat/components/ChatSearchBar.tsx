"use client";

import React from "react";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
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
    <div className="bg-purple-950/60 border-b border-purple-500/30 p-2.5 px-4 flex items-center justify-between gap-2 text-xs">
      <div className="flex-1 flex items-center gap-2">
        <Search className="h-4 w-4 text-purple-400 shrink-0" />
        <Input
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-8 text-xs bg-black/40 border-white/10"
          autoFocus
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-purple-300 font-mono">
          {matchingMessages.length > 0
            ? `${currentMatchIndex + 1} of ${matchingMessages.length}`
            : "No matches"}
        </span>

        {matchingMessages.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevMatch}
              className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white cursor-pointer"
              title="Previous match"
              aria-label="Previous match"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onNextMatch}
              className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white cursor-pointer"
              title="Next match"
              aria-label="Next match"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-white cursor-pointer"
          title="Close search"
          aria-label="Close search"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
