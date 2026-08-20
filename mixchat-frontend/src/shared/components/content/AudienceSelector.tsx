"use client";

import React from "react";
import { Check, Globe2, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type ContentAudience = "PUBLIC" | "FOLLOWERS" | "CLOSE_FRIENDS";

interface AudienceSelectorProps {
  value: ContentAudience;
  onChange: (value: ContentAudience) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

const options = [
  {
    value: "PUBLIC" as const,
    label: "Public",
    description: "Everyone",
    icon: Globe2,
    selectedClass: "bg-purple-500/16 text-purple-100",
    iconClass: "bg-purple-500/18 text-purple-300",
  },
  {
    value: "FOLLOWERS" as const,
    label: "Followers",
    description: "People following you",
    icon: Users,
    selectedClass: "bg-blue-500/14 text-blue-100",
    iconClass: "bg-blue-500/16 text-blue-300",
  },
  {
    value: "CLOSE_FRIENDS" as const,
    label: "Close friends",
    description: "Your private list",
    icon: Sparkles,
    selectedClass: "bg-emerald-500/14 text-emerald-100",
    iconClass: "bg-emerald-500/16 text-emerald-300",
  },
];

export function AudienceSelector({
  value,
  onChange,
  disabled = false,
  label = "Audience",
  description = "Choose who can see this post.",
}: AudienceSelectorProps) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-sm font-bold text-white">{label}</legend>
      <p className="mt-1 text-sm leading-5 text-white/50">{description}</p>
      <div
        className="mt-3 grid grid-cols-3 gap-2"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-white/[0.045] px-2.5 py-3 text-center text-white/55 transition-colors hover:bg-white/[0.075] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-45",
                isSelected && option.selectedClass,
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.055]",
                  isSelected && option.iconClass,
                )}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="text-xs font-bold leading-4 sm:text-sm">
                {option.label}
              </span>
              <span className="hidden text-xs leading-4 text-white/45 lg:block">
                {option.description}
              </span>
              {isSelected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/12">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
