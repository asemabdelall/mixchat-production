"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { safetyService } from "@/services/safety/safetyService";
import { X, AlertTriangle, Loader2, UserX, UserCheck } from "lucide-react";

interface BlockConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUsername: string;
  isBlocked?: boolean;
  onSuccess?: () => void;
}

export const BlockConfirmationModal: React.FC<BlockConfirmationModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUsername,
  isBlocked = false,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAction = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isBlocked) {
        await safetyService.unblockUser(targetUserId);
      } else {
        await safetyService.blockUser(targetUserId);
      }
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Action failed. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#121217] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
        {/* Header Icon */}
        <div className="flex justify-between items-start">
          <div
            className={`p-3 rounded-2xl border ${isBlocked ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
          >
            {isBlocked ? (
              <UserCheck className="w-6 h-6" />
            ) : (
              <UserX className="w-6 h-6" />
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title and Descriptions */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">
            {isBlocked
              ? `Unblock @${targetUsername}?`
              : `Block @${targetUsername}?`}
          </h3>
          <p className="text-sm text-white/60 leading-relaxed">
            {isBlocked
              ? `@${targetUsername} will be able to see your public profile, posts, and message you. Unblocking will not restore previous follow or Close Friends connections.`
              : `@${targetUsername} will not be able to find your profile, message you, or see your posts, stories, reels, and location. They won't be notified that you blocked them.`}
          </p>
        </div>

        {/* Impact List when blocking */}
        {!isBlocked && (
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 text-xs text-white/50">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Existing follow & follow requests will be removed</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>
                Direct messages and typing indicators will be disabled
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Snap Map live location sharing will be terminated</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white/80 font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAction}
            disabled={loading}
            className={`flex-1 py-3 px-4 text-white font-medium rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 ${
              isBlocked
                ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-600/20"
                : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-600/20"
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>{isBlocked ? "Unblock" : "Block User"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
};
