"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";

interface MediaPreviewModalProps {
  mediaUrl: string | null;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  mediaUrl,
  onClose,
}) => {
  if (!mediaUrl) return null;

  return (
    <Modal isOpen={!!mediaUrl} onClose={onClose} maxWidth="lg">
      <div className="flex flex-col items-center justify-center p-2 relative">
        {/* Dynamic signed attachment host; keep native image rather than broaden Next allowlists. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt="Attachment Preview"
          className="max-h-[75vh] w-auto rounded-xl object-contain shadow-2xl border border-white/10"
        />
        <div className="mt-3 flex items-center gap-3">
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel text-xs font-semibold text-purple-300 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Original</span>
          </a>
        </div>
      </div>
    </Modal>
  );
};
