"use client";

import React from "react";
import Link from "next/link";
import { Shield, Ghost, Eye, MapPin, Check, ArrowRight } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { LocationVisibilityMode } from "../types/mapTypes";

interface MapPrivacySheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: LocationVisibilityMode;
  onChangeMode: (mode: LocationVisibilityMode) => void;
}

export const MapPrivacySheet: React.FC<MapPrivacySheetProps> = ({
  isOpen,
  onClose,
  currentMode,
  onChangeMode,
}) => {
  const modes: {
    id: LocationVisibilityMode;
    title: string;
    description: string;
    icon: React.ReactNode;
    badgeColor: string;
  }[] = [
    {
      id: "ghost",
      title: "Ghost Mode",
      description: "You are completely hidden from the social discovery map and nearby lists.",
      icon: <Ghost className="h-5 w-5 text-purple-400" />,
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    },
    {
      id: "approximate",
      title: "Approximate Location (1km Blur)",
      description: "Shows your general neighborhood without exposing your exact street position.",
      icon: <Eye className="h-5 w-5 text-cyan-400" />,
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    },
    {
      id: "friends",
      title: "Friends Only",
      description: "Visible only to confirmed friends on your social graph.",
      icon: <MapPin className="h-5 w-5 text-emerald-400" />,
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    },
    {
      id: "discoverable",
      title: "Public Discoverable",
      description: "Displays your mock pin location on the public discovery map.",
      icon: <MapPin className="h-5 w-5 text-pink-400" />,
      badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/40",
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Map Location Privacy" maxWidth="md">
      <div className="space-y-4">
        <div className="glass-panel p-3.5 rounded-2xl border border-white/10 flex items-center gap-3">
          <Shield className="h-5 w-5 text-purple-400 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Control how your location appears on the Mix Chat discovery map. Settings save automatically to your profile preferences.
          </p>
        </div>

        <div className="space-y-3">
          {modes.map((mode) => {
            const isSelected = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  onChangeMode(mode.id);
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isSelected
                    ? "glass-panel border-purple-500/50 shadow-lg shadow-purple-500/10"
                    : "glass-card border-white/10 hover:border-white/20"
                }`}
              >
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                  {mode.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>{mode.title}</span>
                    </h4>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white shrink-0">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <Link href="/settings/privacy" onClick={onClose}>
            <Button size="xs" variant="glass" className="gap-1.5 text-purple-300">
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
