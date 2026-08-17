"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer select-none",
  {
    variants: {
      variant: {
        gradient:
          "gradient-bg-primary text-white shadow-md shadow-purple-500/20 hover:shadow-purple-500/35 hover:brightness-110",
        glass:
          "glass-card hover:bg-white/10 text-foreground border border-white/10",
        outline:
          "border border-white/15 bg-transparent text-foreground hover:bg-white/10",
        secondary:
          "bg-muted text-foreground hover:bg-muted/80 border border-white/5",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-white/5",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 shadow-md shadow-red-500/20",
        accent:
          "gradient-bg-accent text-white shadow-md shadow-pink-500/20 hover:brightness-110",
      },
      size: {
        default: "min-h-[44px] px-5 py-2.5",
        xs: "min-h-[44px] px-3 text-xs rounded-lg",
        sm: "min-h-[44px] px-3.5 text-xs rounded-lg",
        lg: "min-h-[48px] px-7 text-base rounded-2xl",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] p-0 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "gradient",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? (
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
