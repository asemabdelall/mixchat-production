"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  isOpen,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />,
    info: <Info className="h-4 w-4 text-purple-400 shrink-0" />,
  };

  const borders = {
    success: "border-emerald-500/30 bg-emerald-950/80 text-emerald-100",
    error: "border-rose-500/30 bg-rose-950/80 text-rose-100",
    info: "border-purple-500/30 bg-slate-900/90 text-purple-100",
  };

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl max-w-md text-xs font-semibold",
          borders[type]
        )}
      >
        {icons[type]}
        <span className="flex-1">{message}</span>
        <button
          onClick={onClose}
          className="p-1 hover:opacity-70 transition-opacity cursor-pointer"
          aria-label="Dismiss toast"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
