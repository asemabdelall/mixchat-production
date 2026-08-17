"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  Ghost,
  Users,
  Star,
  EyeOff,
  Check,
  ArrowRight,
} from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";

export interface PrivacyConfigState {
  isGhostMode: boolean;
  visibility: "FRIENDS" | "CLOSE_FRIENDS" | "NOBODY";
}

interface MapPrivacySheetProps {
  isOpen: boolean;
  onClose: () => void;
  isGhostMode: boolean;
  visibility: "FRIENDS" | "CLOSE_FRIENDS" | "NOBODY";
  onUpdatePrivacy: (
    isGhost: boolean,
    visibility: "FRIENDS" | "CLOSE_FRIENDS" | "NOBODY",
  ) => void;
  isLoading?: boolean;
}

export const MapPrivacySheet: React.FC<MapPrivacySheetProps> = ({
  isOpen,
  onClose,
  isGhostMode,
  visibility,
  onUpdatePrivacy,
  isLoading = false,
}) => {
  const options = [
    {
      id: "ghost",
      isGhost: true,
      vis: visibility,
      title: "Ghost Mode",
      description:
        "You are completely hidden from the map. Your coordinates are deleted immediately.",
      icon: <Ghost className="h-5 w-5 text-purple-400" />,
      isSelected: isGhostMode,
    },
    {
      id: "friends",
      isGhost: false,
      vis: "FRIENDS" as const,
      title: "Share with Friends",
      description:
        "Visible to friends who follow you. Ephemeral coordinates expire automatically after 10 minutes.",
      icon: <Users className="h-5 w-5 text-emerald-400" />,
      isSelected: !isGhostMode && visibility === "FRIENDS",
    },
    {
      id: "close_friends",
      isGhost: false,
      vis: "CLOSE_FRIENDS" as const,
      title: "Close Friends Only",
      description: "Visible strictly to users on your Close Friends list.",
      icon: <Star className="h-5 w-5 text-amber-400" />,
      isSelected: !isGhostMode && visibility === "CLOSE_FRIENDS",
    },
    {
      id: "nobody",
      isGhost: false,
      vis: "NOBODY" as const,
      title: "Pause Sharing (Nobody)",
      description: "Stops sharing without turning on full Ghost Mode.",
      icon: <EyeOff className="h-5 w-5 text-rose-400" />,
      isSelected: !isGhostMode && visibility === "NOBODY",
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Map & Location Privacy"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="glass-panel p-3.5 rounded-2xl border border-white/10 flex items-center gap-3">
          <Shield className="h-5 w-5 text-purple-400 shrink-0" />
          <p className="text-xs text-muted-foreground">
            MixChat never tracks location history. Ephemeral coordinates live
            only in memory with a 10-minute TTL.
          </p>
        </div>

        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={isLoading}
              onClick={() => {
                onUpdatePrivacy(opt.isGhost, opt.vis);
              }}
              className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                opt.isSelected
                  ? "glass-panel border-purple-500/50 shadow-lg shadow-purple-500/10"
                  : "glass-card border-white/10 hover:border-white/20"
              }`}
            >
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>{opt.title}</span>
                  </h4>
                  {opt.isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white shrink-0">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <Link href="/settings/privacy" onClick={onClose}>
            <Button
              size="xs"
              variant="glass"
              className="gap-1.5 text-purple-300"
            >
              <span>Full Privacy Settings</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button size="sm" onClick={onClose} className="font-bold">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
