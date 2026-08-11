"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Music, MapPin, Sparkles } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { useReels } from "@/shared/providers/ReelsProvider";

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_CLIPS = [
  {
    id: "clip_1",
    title: "Cyberpunk Night SF",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-lit-city-street-at-night-41557-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "clip_2",
    title: "Tech Lab Code",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-with-green-screen-41221-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "clip_3",
    title: "Forest Echoes",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-38372-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=800&q=80",
  },
];

export const CreateReelModal: React.FC<CreateReelModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { createReel } = useReels();

  const [selectedClip, setSelectedClip] = useState(PRESET_CLIPS[0]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("#MixChat #Reels");
  const [locationTag, setLocationTag] = useState("San Francisco, CA");
  const [audioTitle, setAudioTitle] = useState("Original Audio");
  const [audience, setAudience] = useState<"public" | "friends" | "close_friends">("public");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;

    setIsSubmitting(true);
    const parsedHashtags = hashtags
      .split(" ")
      .filter((h) => h.startsWith("#"))
      .map((h) => h.trim());

    const newReel = createReel({
      videoUrl: selectedClip.videoUrl,
      posterUrl: selectedClip.posterUrl,
      caption: caption.trim(),
      hashtags: parsedHashtags.length > 0 ? parsedHashtags : ["#MixChat"],
      locationTag: locationTag.trim() || undefined,
      visibility: audience,
      audioTitle,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      router.push(`/reels?id=${newReel.id}`);
    }, 600);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Short Reel 🎬" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 py-2 select-none">
        {/* Preset Video Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white flex items-center justify-between">
            <span>Select Video Clip</span>
            <span className="text-[10px] text-purple-300 font-semibold">HD Short Video</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_CLIPS.map((clip) => {
              const isSelected = selectedClip.id === clip.id;
              return (
                <div
                  key={clip.id}
                  onClick={() => setSelectedClip(clip)}
                  className={`relative aspect-[9/16] rounded-2xl overflow-hidden glass-card border cursor-pointer transition-all ${
                    isSelected ? "border-purple-500 ring-2 ring-purple-500/40 scale-105" : "border-white/10 hover:border-white/30 opacity-70"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={clip.posterUrl} alt={clip.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 p-2 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-white bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md self-start">
                      {clip.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Caption Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-white flex items-center justify-between">
            <span>Reel Caption</span>
            <span className="text-[10px] text-muted-foreground">{caption.length}/500</span>
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption for your short reel..."
            maxLength={500}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 resize-none"
          />
        </div>

        {/* Hashtags & Audio Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-white">Hashtags</label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#MixChat #Reels"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-white flex items-center gap-1">
              <Music className="h-3 w-3 text-cyan-400" />
              <span>Audio Soundtrack</span>
            </label>
            <input
              type="text"
              value={audioTitle}
              onChange={(e) => setAudioTitle(e.target.value)}
              placeholder="Original Audio Track"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Location & Audience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-white flex items-center gap-1">
              <MapPin className="h-3 w-3 text-purple-400" />
              <span>Location Tag</span>
            </label>
            <input
              type="text"
              value={locationTag}
              onChange={(e) => setLocationTag(e.target.value)}
              placeholder="San Francisco, CA"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-white">Audience Visibility</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as "public" | "friends" | "close_friends")}
              className="w-full bg-[#0d121f] border border-white/10 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
            >
              <option value="public">🌐 Public (Everyone)</option>
              <option value="friends">👥 Friends Only</option>
              <option value="close_friends">🔒 Close Friends</option>
            </select>
          </div>
        </div>

        {/* Form Footer */}
        <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!caption.trim() || isSubmitting}
            size="sm"
            className="gap-1.5 font-bold gradient-bg-primary text-white shadow-lg"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isSubmitting ? "Publishing Reel..." : "Publish Reel"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
