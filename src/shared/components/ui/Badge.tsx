"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "outline" | "premium";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className,
}) => {
  const variants = {
    primary: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    secondary: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    accent: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    outline: "bg-transparent text-gray-300 border-white/20",
    premium: "gradient-bg-primary text-white shadow-md shadow-purple-500/30 font-bold border-transparent",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-md transition-colors",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
