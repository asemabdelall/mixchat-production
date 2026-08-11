"use client";

import React, { useState } from "react";
import { Image as ImageIcon, MapPin, Sparkles, X, Video } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { CURRENT_USER } from "@/shared/services/mockData";
import { Post } from "@/types";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"image" | "video" | "carousel">("image");
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [locationTag, setLocationTag] = useState("San Francisco, CA");
  const [audience, setAudience] = useState<"public" | "friends" | "close_friends">("public");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsLoading(true);

    setTimeout(() => {
      const newPost: Post = {
        id: `post_${Date.now()}`,
        userId: CURRENT_USER.id,
        user: CURRENT_USER,
        content: content.trim(),
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        mediaType: mediaUrls.length > 1 ? "carousel" : mediaType,
        videoUrl,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        repostsCount: 0,
        isLiked: false,
        isBookmarked: false,
        createdAt: "Just now",
        locationTag,
        audience,
      };

      onPostCreated(newPost);
      setIsLoading(false);
      setContent("");
      setMediaUrls([]);
      setVideoUrl(undefined);
      onClose();
    }, 400);
  };

  const handleAddSamplePhoto = () => {
    const samples = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1000&q=80",
    ];
    const nextUrl = samples[mediaUrls.length % samples.length];
    setMediaUrls((prev) => [...prev, nextUrl]);
    setMediaType(mediaUrls.length > 0 ? "carousel" : "image");
  };

  const handleAddSampleVideo = () => {
    setMediaUrls(["https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1000&q=80"]);
    setVideoUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    setMediaType("video");
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== index));
    if (mediaUrls.length <= 2) setMediaType("image");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Post">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header User Info & Audience Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={CURRENT_USER.avatar} alt={CURRENT_USER.displayName} size="sm" />
            <div>
              <h4 className="font-bold text-xs text-foreground">{CURRENT_USER.displayName}</h4>
              <span className="text-[11px] text-muted-foreground">@{CURRENT_USER.username}</span>
            </div>
          </div>

          {/* Audience Dropdown */}
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as "public" | "friends" | "close_friends")}
            className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-purple-300 focus:outline-none cursor-pointer"
          >
            <option value="public" className="bg-[#111625] text-white">🌐 Public</option>
            <option value="friends" className="bg-[#111625] text-white">👥 Friends Only</option>
            <option value="close_friends" className="bg-[#111625] text-white">⭐️ Close Friends</option>
          </select>
        </div>

        {/* Text Input */}
        <div className="relative">
          <textarea
            rows={4}
            maxLength={280}
            placeholder="What's happening? Share thoughts, media, or tech updates..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            required
          />
          <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground font-mono">
            {content.length}/280
          </span>
        </div>

        {/* Media Thumbnails Preview */}
        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {mediaUrls.map((url, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden border border-white/10 h-24">
                <img src={url} alt="Upload Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(idx)}
                  className="absolute top-1 right-1 rounded-full bg-black/75 p-1 text-white hover:bg-black transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Media Attachments Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleAddSamplePhoto}
              className="flex items-center gap-1.5 rounded-xl glass-card px-2.5 py-1.5 text-xs text-purple-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
              <span>Photo</span>
            </button>

            <button
              type="button"
              onClick={handleAddSampleVideo}
              className="flex items-center gap-1.5 rounded-xl glass-card px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Video className="h-3.5 w-3.5 text-cyan-400" />
              <span>Video</span>
            </button>

            <button
              type="button"
              onClick={() => setLocationTag(prev => prev ? "" : "San Francisco, CA")}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                locationTag ? "glass-card text-blue-300 border border-blue-500/30" : "glass-card text-muted-foreground hover:bg-white/10"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-blue-400" />
              <span>{locationTag ? "SF, CA" : "Location"}</span>
            </button>
          </div>

          <Button type="submit" isLoading={isLoading} disabled={!content.trim()} size="sm">
            <Sparkles className="h-4 w-4" />
            <span>Post</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
