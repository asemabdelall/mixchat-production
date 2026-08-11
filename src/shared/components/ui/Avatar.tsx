"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface AvatarProps {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  hasStory?: boolean;
  isStorySeen?: boolean;
  isVerified?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-xs",
  lg: "w-12 h-12 text-sm",
  xl: "w-16 h-16 text-base",
};

const badgeSizeClasses = {
  xs: "w-2 h-2 right-0 bottom-0",
  sm: "w-2.5 h-2.5 right-0 bottom-0",
  md: "w-3 h-3 right-0 bottom-0",
  lg: "w-3.5 h-3.5 right-0.5 bottom-0.5",
  xl: "w-4 h-4 right-1 bottom-1",
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = "md",
  online,
  hasStory,
  isStorySeen,
  isVerified,
  className,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative inline-block shrink-0 cursor-pointer select-none transition-transform hover:scale-105",
        hasStory && !isStorySeen && "story-ring-active",
        hasStory && isStorySeen && "p-[2px] rounded-full border-2 border-white/20",
        className
      )}
    >
      <div className={cn("relative overflow-hidden rounded-full bg-muted shadow-inner", sizeClasses[size])}>
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>

      {online !== undefined && (
        <span
          className={cn(
            "absolute rounded-full border-2 border-background shadow-md transition-colors",
            online ? "bg-emerald-500" : "bg-gray-500",
            badgeSizeClasses[size]
          )}
        />
      )}

      {isVerified && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full gradient-bg-primary text-[10px] text-white shadow-md">
          <Check className="h-2.5 w-2.5 stroke-[3]" />
        </span>
      )}
    </div>
  );
};
