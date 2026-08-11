"use client";

import React, { useState } from "react";
import { Sparkles, Image as ImageIcon, Check } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Avatar } from "@/shared/components/ui/Avatar";
import { CURRENT_USER } from "@/shared/services/mockData";
import { Story } from "@/types";

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: (story: Story) => void;
}

const colorPresets = [
  { id: "purple", label: "Purple", bg: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)" },
  { id: "pink", label: "Pink Neon", bg: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)" },
  { id: "dark", label: "Cyber Dark", bg: "linear-gradient(135deg, #111827 0%, #0f172a 100%)" },
  { id: "cyan", label: "Ocean Blue", bg: "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)" },
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const [caption, setCaption] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(colorPresets[0]);
  const [mediaUrl, setMediaUrl] = useState<string>("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80");
  const [audience, setAudience] = useState<"public" | "friends" | "close_friends">("public");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const newStory: Story = {
        id: `story_${Date.now()}`,
        userId: CURRENT_USER.id,
        user: CURRENT_USER,
        mediaUrl,
        mediaType: "image",
        caption: caption.trim() || undefined,
        timestamp: "Just now",
        duration: 5,
        viewsCount: 1,
        audience,
      };

      onStoryCreated(newStory);
      setIsLoading(false);
      setCaption("");
      onClose();
    }, 400);
  };

  const handleSimulatePhoto = () => {
    const photos = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    ];
    setMediaUrl(photos[Math.floor(Math.random() * photos.length)]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Story">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header User info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={CURRENT_USER.avatar} alt={CURRENT_USER.displayName} size="sm" />
            <div>
              <h4 className="font-bold text-xs text-white">{CURRENT_USER.displayName}</h4>
              <span className="text-[11px] text-purple-300">Your Story</span>
            </div>
          </div>

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

        {/* Live Canvas Preview */}
        <div
          style={{ background: selectedPreset.bg }}
          className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center p-4 shadow-xl"
        >
          <img src={mediaUrl} alt="Story Preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          {caption && (
            <div className="relative z-10 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-white text-xs max-w-[85%] text-center">
              {caption}
            </div>
          )}
        </div>

        {/* Caption Input */}
        <input
          type="text"
          placeholder="Add a caption to your story..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        {/* Preset Colors */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold">Theme:</span>
          {colorPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedPreset(preset)}
              style={{ background: preset.bg }}
              className={`h-7 w-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                selectedPreset.id === preset.id ? "border-white scale-110" : "border-transparent"
              }`}
            >
              {selectedPreset.id === preset.id && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          ))}
          <button
            type="button"
            onClick={handleSimulatePhoto}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-xl glass-card text-xs text-purple-300 hover:bg-white/10"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Change Photo</span>
          </button>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end pt-2 border-t border-white/10">
          <Button type="submit" isLoading={isLoading} size="sm">
            <Sparkles className="h-4 w-4" />
            <span>Share Story</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
