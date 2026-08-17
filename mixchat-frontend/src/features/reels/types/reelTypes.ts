"use client";

import { User } from "@/types";

export interface ReelAudio {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  isOriginal?: boolean;
}

export interface ReelComment {
  id: string;
  user: User;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

export interface Reel {
  id: string;
  author: User;
  videoUrl: string;
  posterUrl: string;
  caption: string;
  createdAt: string;
  audio: ReelAudio;
  hashtags: string[];
  locationTag?: string;
  visibility: "public" | "friends" | "close_friends";
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  comments?: ReelComment[];
  discoveryReason?: string;
}
