"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check, Eye, Lock, Shield } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

interface RevealIdentitySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestReveal: () => void;
  onCancelReveal: () => void;
  hasViewerConsented: boolean;
  hasPartnerConsented: boolean;
  isLoading?: boolean;
}

export const RevealIdentitySheet: React.FC<RevealIdentitySheetProps> = ({
  isOpen,
  onClose,
  onRequestReveal,
  onCancelReveal,
  hasViewerConsented,
  hasPartnerConsented,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-center"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-purple-600/20 blur-[60px] pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center mb-5 shadow-lg shadow-purple-900/40">
            <Eye className="w-8 h-8 text-white" />
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
            Mutual Identity Reveal
          </h3>

          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6">
            Identity exchange only occurs when{" "}
            <strong className="text-white">both</strong> of you explicitly
            agree. If you consent, your partner will be notified to accept or
            decline.
          </p>

          {/* Consent Status Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                hasViewerConsented
                  ? "bg-purple-950/40 border-purple-500/60"
                  : "bg-zinc-800/40 border-zinc-700/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase">
                  You
                </span>
                {hasViewerConsented ? (
                  <Check className="w-4 h-4 text-purple-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </div>
              <p
                className={`text-xs font-semibold ${
                  hasViewerConsented ? "text-purple-300" : "text-zinc-400"
                }`}
              >
                {hasViewerConsented ? "Consented" : "Pending your choice"}
              </p>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                hasPartnerConsented
                  ? "bg-emerald-950/40 border-emerald-500/60"
                  : "bg-zinc-800/40 border-zinc-700/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-zinc-400 uppercase">
                  Partner
                </span>
                {hasPartnerConsented ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </div>
              <p
                className={`text-xs font-semibold ${
                  hasPartnerConsented
                    ? "text-emerald-300"
                    : "Waiting for partner"
                }`}
              >
                {hasPartnerConsented
                  ? "Ready to Reveal!"
                  : "Waiting for partner"}
              </p>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-800/30 border border-zinc-700/40 text-[11px] text-zinc-400 mb-6 text-left">
            <Shield className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              After reveal, you will see each other’s standard MixChat profile
              cards.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {!hasViewerConsented ? (
              <Button
                onClick={() => {
                  onRequestReveal();
                  onClose();
                }}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {hasPartnerConsented
                    ? "Accept & Reveal Both Profiles"
                    : "Request Identity Reveal"}
                </span>
              </Button>
            ) : (
              <Button
                onClick={() => {
                  onCancelReveal();
                  onClose();
                }}
                disabled={isLoading}
                variant="glass"
                className="w-full py-3 rounded-xl border-zinc-700 text-zinc-300 hover:text-white font-semibold text-sm"
              >
                Cancel My Reveal Request
              </Button>
            )}

            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-zinc-300"
            >
              Keep Chat Anonymous
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
