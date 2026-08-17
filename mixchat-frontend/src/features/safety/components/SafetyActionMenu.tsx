"use client";

import React, { useState } from "react";
import {
  VolumeX,
  Volume2,
  UserX,
  MoreVertical,
  Flag,
  Loader2,
} from "lucide-react";
import { UniversalReportModal } from "./UniversalReportModal";
import { BlockConfirmationModal } from "./BlockConfirmationModal";
import {
  safetyService,
  ReportTargetType,
} from "@/services/safety/safetyService";

interface SafetyActionMenuProps {
  targetUserId: string;
  targetUsername: string;
  targetType: ReportTargetType;
  targetId: string;
  isMuted?: boolean;
  isBlocked?: boolean;
  onMuteToggle?: (muted: boolean) => void;
  onBlockSuccess?: () => void;
  className?: string;
}

export const SafetyActionMenu: React.FC<SafetyActionMenuProps> = ({
  targetUserId,
  targetUsername,
  targetType,
  targetId,
  isMuted = false,
  isBlocked = false,
  onMuteToggle,
  onBlockSuccess,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [muted, setMuted] = useState(isMuted);
  const [muteLoading, setMuteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMute = async () => {
    setMuteLoading(true);
    setError(null);
    try {
      if (muted) {
        await safetyService.unmuteUser(targetUserId);
        setMuted(false);
        if (onMuteToggle) onMuteToggle(false);
      } else {
        await safetyService.muteUser(targetUserId);
        setMuted(true);
        if (onMuteToggle) onMuteToggle(true);
      }
      setIsOpen(false);
    } catch {
      setError("Mute preference could not be updated. Please try again.");
    } finally {
      setMuteLoading(false);
    }
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Safety & moderation options"
          aria-expanded={isOpen}
          className="flex min-h-11 min-w-11 items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {isOpen && (
          <>
            <button
              type="button"
              aria-label="Close safety options"
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-[#16161d] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
              {/* Report */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowReportModal(true);
                }}
                className="min-h-11 w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center space-x-2.5 transition-colors"
              >
                <Flag className="w-4 h-4" />
                <span>Report...</span>
              </button>

              {/* Mute */}
              <button
                onClick={handleMute}
                disabled={muteLoading}
                className="min-h-11 w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5 flex items-center space-x-2.5 transition-colors"
              >
                {muteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                ) : muted ? (
                  <Volume2 className="w-4 h-4 text-white/60" />
                ) : (
                  <VolumeX className="w-4 h-4 text-white/60" />
                )}
                <span>{muted ? "Unmute User" : "Mute User"}</span>
              </button>

              {/* Block */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowBlockModal(true);
                }}
                className="min-h-11 w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center space-x-2.5 transition-colors border-t border-white/5"
              >
                <UserX className="w-4 h-4" />
                <span>{isBlocked ? "Unblock User" : "Block User"}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {/* Report Modal */}
      <UniversalReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType={targetType}
        targetId={targetId}
        targetTitle={`@${targetUsername}`}
      />

      {/* Block Modal */}
      <BlockConfirmationModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        targetUserId={targetUserId}
        targetUsername={targetUsername}
        isBlocked={isBlocked}
        onSuccess={onBlockSuccess}
      />
    </>
  );
};
