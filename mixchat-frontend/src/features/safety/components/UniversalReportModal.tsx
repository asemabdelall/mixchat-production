"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  safetyService,
  ReportTargetType,
  ReportReason,
  ReportReceipt,
} from "@/services/safety/safetyService";
import {
  ShieldAlert,
  X,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Info,
} from "lucide-react";
import { Textarea } from "@/shared/components/ui/Textarea";

interface UniversalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  onSuccess?: (receipt: ReportReceipt) => void;
}

const REPORT_REASONS: {
  value: ReportReason;
  label: string;
  description: string;
}[] = [
  {
    value: "SPAM",
    label: "Spam or Scam",
    description:
      "Deceptive links, repetitive bots, financial scams, or commercial ads",
  },
  {
    value: "HARASSMENT",
    label: "Harassment or Bullying",
    description: "Targeted attacks, threats, insults, or stalking behavior",
  },
  {
    value: "HATE_OR_ABUSE",
    label: "Hate Speech & Abuse",
    description:
      "Slurs, dehumanizing rhetoric, or discrimination against protected groups",
  },
  {
    value: "SEXUAL_CONTENT",
    label: "Nudity & Sexual Content",
    description:
      "Sexually explicit material, non-consensual imagery, or sexual solicitation",
  },
  {
    value: "VIOLENCE",
    label: "Violence & Dangerous Acts",
    description:
      "Graphic violence, terrorism, physical threats, or illegal contraband",
  },
  {
    value: "IMPERSONATION",
    label: "Impersonation",
    description: "Pretending to be someone else or misleading identity",
  },
  {
    value: "PRIVACY",
    label: "Privacy Violation",
    description:
      "Doxxing, sharing private contact info or confidential documents",
  },
  {
    value: "SELF_HARM",
    label: "Self-Harm & Suicide",
    description: "Encouragement or depiction of self-harm or suicide",
  },
  {
    value: "OTHER",
    label: "Other Safety Concern",
    description: "Other violations not listed above",
  },
];

export const UniversalReportModal: React.FC<UniversalReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null,
  );
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReportReceipt | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setError("Please select a reason for reporting.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await safetyService.submitReport({
        targetType,
        targetId,
        reason: selectedReason,
        details: details.trim() || undefined,
      });

      setReceipt(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        "Failed to submit report. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDetails("");
    setError(null);
    setReceipt(null);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#121217] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Report Content</h3>
              <p className="text-xs text-white/50">
                {targetTitle
                  ? `Reporting: ${targetTitle}`
                  : `Reporting ${targetType.toLowerCase()}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {receipt ? (
            /* Success State */
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h4 className="text-xl font-bold text-white">Report Received</h4>
              <p className="text-sm text-white/70 max-w-sm mx-auto">
                {receipt.message}
              </p>
              <div className="p-4 bg-white/[0.03] border border-white/5 rounded-xl text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Report ID:</span>
                  <span className="font-mono text-white/80">{receipt.id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Category:</span>
                  <span className="text-white/80">{receipt.reason}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Status:</span>
                  <span className="text-emerald-400 font-medium capitalize">
                    {receipt.status.toLowerCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400 text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                  Select a Reason
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                  {REPORT_REASONS.map((r) => {
                    const isSelected = selectedReason === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setSelectedReason(r.value)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col ${
                          isSelected
                            ? "bg-red-500/10 border-red-500/40 shadow-sm shadow-red-500/5"
                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                        }`}
                      >
                        <span
                          className={`text-sm font-semibold ${isSelected ? "text-red-400" : "text-white"}`}
                        >
                          {r.label}
                        </span>
                        <span className="text-xs text-white/50 mt-0.5">
                          {r.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Textarea
                label="Additional Details (Optional)"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder="Provide any specific context or timestamps to help our safety team investigate..."
                rows={3}
                charCount={details.length}
                maxCharCount={1000}
              />

              <div className="flex items-center space-x-2 text-xs text-white/40 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  Reports are completely confidential. The reported user will
                  never know who reported them.
                </span>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white/80 font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedReason}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
};
