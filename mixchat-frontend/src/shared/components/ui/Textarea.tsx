"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  charCount?: number;
  maxCharCount?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      charCount,
      maxCharCount,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId = props.id ?? generatedId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={textareaId}
              className="text-xs font-bold text-white/80 tracking-wide block"
            >
              {label}
            </label>
            {maxCharCount !== undefined && charCount !== undefined && (
              <span className="text-[11px] font-mono text-white/40">
                {charCount}/{maxCharCount}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          <textarea
            id={textareaId}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : props["aria-describedby"]
            }
            className={cn(
              "flex min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-medium text-white placeholder:text-white/30 transition-all duration-200 ease-out resize-y",
              "hover:border-white/20 hover:bg-white/[0.06]",
              "focus:border-purple-500/60 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 focus:outline-none focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10",
              error &&
                "border-rose-500/50 hover:border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-500/[0.03]",
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-rose-400 font-medium flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150"
          >
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
Textarea.displayName = "Textarea";
