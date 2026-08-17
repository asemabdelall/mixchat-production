"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon, rightElement, error, helperText, ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold text-white/80 tracking-wide block"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center group">
          {icon && (
            <span className="absolute left-3.5 text-white/40 group-focus-within:text-purple-400 transition-colors duration-200 pointer-events-none flex items-center justify-center">
              {icon}
            </span>
          )}
          <input
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : props["aria-describedby"]
            }
            className={cn(
              "flex h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white placeholder:text-white/30 transition-all duration-200 ease-out",
              "hover:border-white/20 hover:bg-white/[0.06]",
              "focus:border-purple-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 focus:outline-none focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10",
              icon && "pl-10",
              rightElement && "pr-11",
              error && "border-rose-500/50 hover:border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-500/[0.03]",
              className,
            )}
            ref={ref}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3.5 flex items-center justify-center z-10 pointer-events-auto text-white/60">
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-rose-400 font-medium flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-[11px] text-white/40">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
