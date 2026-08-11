"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "Failed to load requested data. Please check your connection and try again.",
  onRetry,
  className = "",
}) => {
  return (
    <div className={`glass-panel rounded-3xl border border-red-500/30 bg-red-950/20 p-6 text-center space-y-4 select-none ${className}`}>
      <div className="mx-auto w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center shadow-lg">
        <AlertTriangle className="h-6 w-6" />
      </div>

      <div className="space-y-1.5 max-w-sm mx-auto">
        <h3 className="font-bold text-sm text-white">{title}</h3>
        <p className="text-xs text-red-200/80 leading-relaxed">{message}</p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button
            type="button"
            size="sm"
            onClick={onRetry}
            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>
        </div>
      )}
    </div>
  );
};
