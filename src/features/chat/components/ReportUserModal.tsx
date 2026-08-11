"use client";

import React, { useState } from "react";
import { ShieldAlert, Check } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { useChat } from "@/shared/providers/ChatProvider";

interface ReportUserModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  "Spam or unsolicited commercial messages",
  "Harassment or bullying behavior",
  "Inappropriate or sensitive content",
  "Impersonation or fake profile",
  "Other violations of community guidelines",
];

export const ReportUserModal: React.FC<ReportUserModalProps> = ({ userId, isOpen, onClose }) => {
  const { reportUser } = useChat();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [submitted, setSubmitted] = useState(false);

  if (!userId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reportUser(userId, selectedReason);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report User" maxWidth="sm">
      {submitted ? (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
            <Check className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-foreground">Report Submitted</h4>
          <p className="text-xs text-muted-foreground">
            Thank you for helping keep Mix Chat safe. Our team will review this report.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Please select the reason for reporting this user:
          </p>

          <div className="space-y-1.5">
            {REPORT_REASONS.map((reason) => (
              <label
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer text-xs transition-colors border ${
                  selectedReason === reason
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-200"
                    : "glass-card border-white/5 text-muted-foreground hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="accent-purple-500"
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="glass" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" size="sm" className="font-bold">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              Submit Report
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
