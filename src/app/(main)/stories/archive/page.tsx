"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Eye } from "lucide-react";
import { MOCK_ARCHIVED_STORIES } from "@/shared/services/mockData";
import { Story } from "@/types";
import { Card } from "@/shared/components/ui/Card";
import { StoryViewerModal } from "@/features/stories/components/StoryViewerModal";

export default function StoryArchivePage() {
  const router = useRouter();
  const [archivedStories] = useState<Story[]>(MOCK_ARCHIVED_STORIES);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between glass-panel p-4 rounded-3xl border border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="p-2 rounded-2xl glass-card text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-400" />
              <span>Story Archive</span>
              <span className="text-xs text-purple-300 font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20">
                {archivedStories.length}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">Only visible to you • Previous story memories</p>
          </div>
        </div>
      </div>

      {/* Grid of Archived Stories */}
      {archivedStories.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {archivedStories.map((story) => (
            <div
              key={story.id}
              onClick={() => setSelectedStory(story)}
              className="relative aspect-[9/16] rounded-2xl overflow-hidden glass-card border border-white/10 group cursor-pointer shadow-lg hover:border-purple-500/50 transition-all"
            >
              <img
                src={story.mediaUrl}
                alt="Archived Story"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full w-fit">
                  {story.timestamp}
                </span>

                <div>
                  {story.caption && (
                    <p className="text-xs text-white font-medium line-clamp-2 mb-1 drop-shadow-md">
                      {story.caption}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-purple-300 font-semibold">
                    <Eye className="h-3 w-3" />
                    <span>{story.viewsCount} views</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="glass-panel p-12 text-center border-white/10 space-y-4">
          <Clock className="h-10 w-10 text-purple-400 mx-auto opacity-40" />
          <h3 className="text-base font-bold text-white">No archived stories</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Stories you share will be archived here after 24 hours so you can revisit them anytime.
          </p>
        </Card>
      )}

      {/* Story Viewer Modal when clicked */}
      {selectedStory && (
        <StoryViewerModal story={selectedStory} onClose={() => setSelectedStory(null)} />
      )}
    </div>
  );
}
