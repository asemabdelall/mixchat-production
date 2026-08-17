"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverEffect = false,
  glass = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all duration-200",
        glass ? "glass-card" : "bg-[#111625] border-white/8",
        hoverEffect &&
          "hover:border-purple-500/30 hover:bg-white/[0.05] cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
