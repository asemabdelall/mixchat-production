"use client";

import React, { createContext, useContext, useState } from "react";
import { Reel, ReelComment } from "@/features/reels/types/reelTypes";
import { INITIAL_REELS } from "@/shared/services/reelsData";
import { CURRENT_USER } from "@/shared/services/mockData";

interface ReelsContextType {
  reels: Reel[];
  activeReelId: string | null;
  setActiveReelId: (id: string | null) => void;
  toggleLikeReel: (id: string) => void;
  toggleSaveReel: (id: string) => void;
  addReelComment: (reelId: string, content: string) => void;
  createReel: (newReelData: {
    videoUrl: string;
    posterUrl: string;
    caption: string;
    hashtags: string[];
    locationTag?: string;
    visibility: "public" | "friends" | "close_friends";
    audioTitle?: string;
  }) => Reel;
}

const ReelsContext = createContext<ReelsContextType | undefined>(undefined);

export const ReelsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);
  const [activeReelId, setActiveReelId] = useState<string | null>(INITIAL_REELS[0].id);

  const toggleLikeReel = (id: string) => {
    setReels((prev) =>
      prev.map((reel) => {
        if (reel.id === id) {
          const nextLiked = !reel.isLiked;
          return {
            ...reel,
            isLiked: nextLiked,
            likesCount: nextLiked ? reel.likesCount + 1 : Math.max(0, reel.likesCount - 1),
          };
        }
        return reel;
      })
    );
  };

  const toggleSaveReel = (id: string) => {
    setReels((prev) =>
      prev.map((reel) => {
        if (reel.id === id) {
          return {
            ...reel,
            isSaved: !reel.isSaved,
          };
        }
        return reel;
      })
    );
  };

  const addReelComment = (reelId: string, content: string) => {
    if (!content.trim()) return;

    const newComment: ReelComment = {
      id: `rc_${Date.now()}`,
      user: CURRENT_USER,
      content: content.trim(),
      createdAt: "Just now",
      likesCount: 0,
    };

    setReels((prev) =>
      prev.map((reel) => {
        if (reel.id === reelId) {
          return {
            ...reel,
            commentsCount: reel.commentsCount + 1,
            comments: [newComment, ...(reel.comments || [])],
          };
        }
        return reel;
      })
    );
  };

  const createReel = (newReelData: {
    videoUrl: string;
    posterUrl: string;
    caption: string;
    hashtags: string[];
    locationTag?: string;
    visibility: "public" | "friends" | "close_friends";
    audioTitle?: string;
  }): Reel => {
    const created: Reel = {
      id: `reel_${Date.now()}`,
      author: CURRENT_USER,
      videoUrl: newReelData.videoUrl,
      posterUrl: newReelData.posterUrl,
      caption: newReelData.caption,
      createdAt: "Just now",
      audio: {
        id: `audio_${Date.now()}`,
        title: newReelData.audioTitle || `${CURRENT_USER.displayName} • Original Audio`,
        artist: CURRENT_USER.displayName,
        isOriginal: true,
      },
      hashtags: newReelData.hashtags,
      locationTag: newReelData.locationTag,
      visibility: newReelData.visibility,
      likesCount: 1,
      commentsCount: 0,
      sharesCount: 0,
      viewsCount: 1,
      isLiked: true,
      isSaved: false,
      comments: [],
    };

    setReels((prev) => [created, ...prev]);
    setActiveReelId(created.id);
    return created;
  };

  return (
    <ReelsContext.Provider
      value={{
        reels,
        activeReelId,
        setActiveReelId,
        toggleLikeReel,
        toggleSaveReel,
        addReelComment,
        createReel,
      }}
    >
      {children}
    </ReelsContext.Provider>
  );
};

export const useReels = () => {
  const context = useContext(ReelsContext);
  if (!context) {
    throw new Error("useReels must be used within a ReelsProvider");
  }
  return context;
};
