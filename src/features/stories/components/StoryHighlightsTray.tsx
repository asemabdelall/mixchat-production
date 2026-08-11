"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { StoryHighlight } from "@/types";
import { MOCK_HIGHLIGHTS } from "@/shared/services/mockData";
import { StoryViewerModal } from "./StoryViewerModal";

interface StoryHighlightsTrayProps {
  isOwnProfile?: boolean;
}

export const StoryHighlightsTray: React.FC<StoryHighlightsTrayProps> = ({ isOwnProfile }) => {
  const [highlights] = useState<StoryHighlight[]>(MOCK_HIGHLIGHTS);
  const [activeHighlight, setActiveHighlight] = useState<StoryHighlight | null>(null);

  return (
    <div className="w-full py-2">
      <div className="flex items-center gap-4 overflow-x-auto custom-scrollbar pb-2">
        {/* Add Highlight button for own profile */}
        {isOwnProfile && (
          <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-purple-400/50 glass-card text-purple-300 group-hover:border-purple-400 group-hover:scale-105 transition-all">
              <Plus className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-white transition-colors">New</span>
          </div>
        )}

        {/* Highlights List */}
        {highlights.map((hl) => (
          <div
            key={hl.id}
            onClick={() => setActiveHighlight(hl)}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
          >
            <div className="relative p-[2px] rounded-full border-2 border-purple-500/80 group-hover:scale-105 transition-transform">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-black">
                <img src={hl.coverImage} alt={hl.title} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-[11px] font-semibold text-white truncate max-w-[70px]">
              {hl.title}
            </span>
          </div>
        ))}
      </div>

      {/* Highlight Viewer Modal */}
      {activeHighlight && activeHighlight.stories.length > 0 && (
        <StoryViewerModal
          story={activeHighlight.stories[0]}
          onClose={() => setActiveHighlight(null)}
        />
      )}
    </div>
  );
};
