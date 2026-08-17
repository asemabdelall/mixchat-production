"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  fullWidth?: boolean;
  align?: "left" | "center" | "right";
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  fullWidth = false,
  align = "left",
}) => {
  const indicatorId = useId();

  return (
    <div
      className={cn(
        "flex",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        align === "left" && "justify-start",
        fullWidth && "w-full",
      )}
    >
      <div
        role="tablist"
        className={cn(
          "relative overflow-x-auto no-scrollbar scroll-smooth rounded-2xl bg-white/[0.04] p-1 backdrop-blur-md border border-white/10 select-none",
          fullWidth ? "w-full flex" : "w-fit inline-flex",
          className,
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1",
            fullWidth ? "w-full" : "min-w-max",
          )}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                type="button"
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "relative min-h-10 flex items-center justify-center gap-2 rounded-xl py-2 px-4 text-xs font-semibold transition-all duration-200 z-10 whitespace-nowrap cursor-pointer",
                  fullWidth ? "flex-1 w-full" : "shrink-0",
                  isActive
                    ? "text-white font-bold"
                    : "text-white/60 hover:text-white hover:bg-white/[0.03]",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId={`active-tab-${indicatorId}`}
                    className="absolute inset-0 rounded-xl gradient-bg-primary shadow-md shadow-purple-500/25 pointer-events-none"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {tab.icon && (
                    <span className={cn("shrink-0", isActive ? "text-white" : "opacity-75")}>
                      {tab.icon}
                    </span>
                  )}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-purple-500/20 text-purple-300",
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
