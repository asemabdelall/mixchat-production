"use client";

import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div className={`glass-panel rounded-3xl border border-white/10 p-8 text-center space-y-4 select-none ${className}`}>
      <div className="mx-auto w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shadow-lg">
        <Icon className="h-6 w-6" />
      </div>

      <div className="space-y-1.5 max-w-sm mx-auto">
        <h3 className="font-bold text-sm text-white">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {actionLabel && onAction && (
        <div className="pt-2">
          <Button
            type="button"
            size="sm"
            onClick={onAction}
            className="gradient-bg-primary text-white text-xs font-bold shadow-md hover:scale-105 transition-transform"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
