"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X, Ban, Flag, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

interface AnonymousSafetySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onBlock: () => void;
  onReport: (reason: string, details?: string) => void;
  partnerPersonaName: string;
}

const REPORT_REASONS = [
  "Harassment or bullying",
  "Inappropriate or explicit content",
  "Spam, scams or promotional links",
  "Hate speech or discriminatory language",
  "Threats of violence or self-harm",
];

export const AnonymousSafetySheet: React.FC<AnonymousSafetySheetProps> = ({
  isOpen,
  onClose,
  onBlock,
  onReport,
  partnerPersonaName,
}) => {
  const [activeTab, setActiveTab] = useState<"MENU" | "REPORT">("MENU");
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");

  if (!isOpen) return null;

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReport(selectedReason, details.trim() || undefined);
    onClose();
  };

  const handleBlockConfirm = () => {
    onBlock();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-left"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {activeTab === "MENU" ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Safety & Moderation
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Options for {partnerPersonaName}
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Your safety is our top priority. Blocking or reporting will
                immediately terminate this anonymous session.
              </p>

              <div className="space-y-3">
                {/* Block Option */}
                <button
                  type="button"
                  onClick={handleBlockConfirm}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-800/50 hover:bg-red-950/30 border border-zinc-700/60 hover:border-red-500/50 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Ban className="w-5 h-5 text-red-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-red-300">
                        Block User
                      </h4>
                      <p className="text-xs text-zinc-400">
                        You will never be matched or connected with this user
                        again.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Report Option */}
                <button
                  type="button"
                  onClick={() => setActiveTab("REPORT")}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-800/50 hover:bg-amber-950/30 border border-zinc-700/60 hover:border-amber-500/50 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Flag className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-amber-300">
                        Report to Safety Team
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Flag harassment, hate speech, spam or harmful behavior.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800">
                <Button
                  onClick={onClose}
                  variant="glass"
                  size="sm"
                  className="w-full rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReportSubmit}>
              <div className="flex items-center gap-2 mb-4 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Report User</h3>
              </div>

              <p className="text-xs text-zinc-400 mb-4">
                Select the primary violation you are experiencing:
              </p>

              <div className="space-y-2 mb-4">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedReason === reason
                        ? "bg-amber-950/30 border-amber-500/60 text-white font-medium"
                        : "bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="accent-amber-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide context for our review team..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setActiveTab("MENU")}
                  variant="glass"
                  size="sm"
                  className="flex-1 rounded-xl"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  className="flex-1 rounded-xl font-semibold"
                >
                  Submit Report & End
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
