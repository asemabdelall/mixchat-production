"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Avatar } from "@/shared/components/ui/Avatar";
import { MOCK_STORIES, CURRENT_USER } from "@/shared/services/mockData";
import { Story } from "@/types";
import { StoryViewerModal } from "./StoryViewerModal";
import { CreateStoryModal } from "./CreateStoryModal";

export const StoryTray: React.FC = () => {
  const [stories, setStories] = useState<Story[]>(MOCK_STORIES);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [seenStoryIds, setSeenStoryIds] = useState<Set<string>>(new Set());

  const handleStoryCreated = (newStory: Story) => {
    setStories([newStory, ...stories]);
    // Immediately open the newly created story
    setActiveStoryIndex(0);
  };

  const handleOpenStory = (index: number, id: string) => {
    setActiveStoryIndex(index);
    setSeenStoryIds((prev) => new Set(prev).add(id));
  };

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <>
      <div className="w-full overflow-x-auto no-scrollbar pb-2 mb-6 select-none">
        <div className="flex items-center gap-3.5 min-w-max">
          {/* Add Story Card */}
          <div
            onClick={() => setIsCreateStoryOpen(true)}
            className="flex flex-col items-center gap-1.5 cursor-pointer group"
          >
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full glass-card border border-white/20 transition-transform group-hover:scale-105">
              <Avatar src={CURRENT_USER.avatar} alt="Your Story" size="lg" />
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full gradient-bg-primary text-white shadow-md border-2 border-background">
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
              </span>
            </div>
            <span className="text-[11px] font-medium text-purple-300 group-hover:text-purple-200">Your Story</span>
          </div>

          {/* User Stories */}
          {stories.map((story, idx) => {
            const isSeen = seenStoryIds.has(story.id);

            return (
              <div
                key={story.id}
                onClick={() => handleOpenStory(idx, story.id)}
                className="flex flex-col items-center gap-1.5 cursor-pointer group"
              >
                <Avatar
                  src={story.user.avatar}
                  alt={story.user.displayName}
                  size="lg"
                  hasStory
                  isStorySeen={isSeen}
                />
                <span className="text-[11px] font-medium text-foreground truncate max-w-[72px]">
                  {story.user.displayName.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story Viewer Dialog */}
      {activeStory && (
        <StoryViewerModal
          story={activeStory}
          onClose={() => setActiveStoryIndex(null)}
          onNextStory={() => {
            if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
              const nextIdx = activeStoryIndex + 1;
              setActiveStoryIndex(nextIdx);
              setSeenStoryIds((prev) => new Set(prev).add(stories[nextIdx].id));
            } else {
              setActiveStoryIndex(null);
            }
          }}
          onPrevStory={() => {
            if (activeStoryIndex !== null && activeStoryIndex > 0) {
              const prevIdx = activeStoryIndex - 1;
              setActiveStoryIndex(prevIdx);
              setSeenStoryIds((prev) => new Set(prev).add(stories[prevIdx].id));
            }
          }}
        />
      )}

      {/* Create Story Dialog */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={handleStoryCreated}
      />
    </>
  );
};
