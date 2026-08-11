"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon, rightElement, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3.5 text-muted-foreground transition-colors pointer-events-none">
              {icon}
            </span>
          )}
          <input
            className={cn(
              "flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-foreground placeholder:text-muted-foreground/80 transition-all duration-200 focus:border-primary focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-10",
              rightElement && "pr-11",
              error && "border-destructive focus:ring-destructive/50",
              className
            )}
            ref={ref}
            {...props}
          />
          {rightElement && <div className="absolute right-3">{rightElement}</div>}
        </div>
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
