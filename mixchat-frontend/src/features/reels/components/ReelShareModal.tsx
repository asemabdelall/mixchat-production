"use client";

import React, { useState } from "react";
import { Copy, Film, Check, Share2 } from "lucide-react";
import type { ReelItemDto } from "@/services/reels/reelsService";
import { Modal } from "@/shared/components/ui/Modal";

interface ReelShareModalProps {
  reel: ReelItemDto;
  isOpen: boolean;
  onClose: () => void;
}

export const ReelShareModal: React.FC<ReelShareModalProps> = ({
  reel,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/reels?id=${reel.id}`;
    }
    return "";
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    setError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("The link could not be copied. Please try again.");
    }
  };

  const handleNativeShare = async () => {
    const url = getShareUrl();
    setError(null);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `MixChat Reel by @${reel.author.username}`,
          text: reel.caption || "Check out this Reel on MixChat!",
          url,
        });
        onClose();
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") {
          return;
        }
        setError("The system share sheet could not be opened.");
      }
    } else {
      await handleCopyLink();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Reel" maxWidth="md">
      <div className="space-y-4">
            {/* Reel Quick Preview */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="h-14 w-10 rounded-xl overflow-hidden bg-black shrink-0 relative">
                {reel.video.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={reel.video.posterUrl}
                    alt="Reel thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-purple-900/30">
                    <Film className="h-4 w-4 text-purple-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  @{reel.author.username}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {reel.caption || "Video Reel on MixChat"}
                </p>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200">
                {error}
              </p>
            )}

            {/* Share Options */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex min-h-11 items-center justify-center gap-2 p-3 rounded-2xl gradient-bg-primary text-white text-xs font-bold shadow-lg shadow-purple-500/25 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
              >
                <Share2 className="h-4 w-4" />
                <span>Share via...</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex min-h-11 items-center justify-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold cursor-pointer active:scale-95 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-green-400">Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-purple-300" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
      </div>
    </Modal>
  );
};
