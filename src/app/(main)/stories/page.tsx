"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { MOCK_STORIES, CURRENT_USER } from "@/shared/services/mockData";
import { Story } from "@/types";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { StoryViewerModal } from "@/features/stories/components/StoryViewerModal";
import { CreateStoryModal } from "@/features/stories/components/CreateStoryModal";

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>(MOCK_STORIES);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);

  const handleStoryCreated = (newStory: Story) => {
    setStories([newStory, ...stories]);
  };

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white gradient-text">Mix Stories & Moments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Explore 24-hour visual moments from friends and creators</p>
        </div>

        <Button onClick={() => setIsCreateStoryOpen(true)} size="sm" className="gap-1.5 shadow-purple-500/30">
          <Plus className="h-4 w-4" />
          <span>Add Story</span>
        </Button>
      </div>

      {/* Story Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {/* Your Story Creator Card */}
        <Card
          onClick={() => setIsCreateStoryOpen(true)}
          className="glass-panel p-0 aspect-[9/16] relative overflow-hidden rounded-2xl border-white/10 group cursor-pointer flex flex-col justify-between"
        >
          <img
            src={CURRENT_USER.avatar}
            alt="Your Story"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="relative z-10 p-3 flex justify-end">
            <span className="text-[10px] font-bold text-white bg-purple-500/30 px-2 py-0.5 rounded-full border border-purple-500/40">
              Create
            </span>
          </div>
          <div className="relative z-10 p-3 text-center flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg-primary text-white shadow-lg mb-1.5 border-2 border-background">
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-white">Your Story</span>
          </div>
        </Card>

        {/* User Story Cards */}
        {stories.map((story, idx) => (
          <Card
            key={story.id}
            onClick={() => setActiveStoryIndex(idx)}
            className="glass-panel p-0 aspect-[9/16] relative overflow-hidden rounded-2xl border-white/10 group cursor-pointer flex flex-col justify-between"
          >
            <img
              src={story.mediaUrl}
              alt={story.user.displayName}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

            <div className="relative z-10 p-3 flex items-center gap-2">
              <Avatar src={story.user.avatar} alt={story.user.displayName} size="sm" hasStory />
              <span className="text-xs font-bold text-white truncate shadow-sm">
                {story.user.displayName.split(" ")[0]}
              </span>
            </div>

            <div className="relative z-10 p-3">
              <p className="text-xs text-white/90 line-clamp-2 font-medium">{story.caption || "Tap to view story"}</p>
              <span className="text-[10px] text-white/60 mt-1 block">{story.timestamp}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Story Viewer Dialog */}
      {activeStory && (
        <StoryViewerModal
          story={activeStory}
          onClose={() => setActiveStoryIndex(null)}
          onNextStory={() => {
            if (activeStoryIndex !== null && activeStoryIndex < stories.length - 1) {
              setActiveStoryIndex(activeStoryIndex + 1);
            } else {
              setActiveStoryIndex(null);
            }
          }}
          onPrevStory={() => {
            if (activeStoryIndex !== null && activeStoryIndex > 0) {
              setActiveStoryIndex(activeStoryIndex - 1);
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
    </div>
  );
}
