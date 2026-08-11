"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Clock, Heart, Bookmark, UserCheck, MapPin } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Tabs, TabItem } from "@/shared/components/ui/Tabs";

const activityTabs: TabItem[] = [
  { id: "all", label: "All Activity" },
  { id: "social", label: "Social" },
  { id: "saved", label: "Bookmarks" },
  { id: "privacy", label: "Privacy & Map" },
];

export const ActivityTimelineV2: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");

  const activityEvents = [
    {
      id: "a1",
      category: "social",
      title: "Started following @marcus",
      description: "You added Marcus Vance to your following list",
      timestamp: "10 minutes ago",
      icon: <UserCheck className="h-4 w-4 text-emerald-400" />,
      link: "/profile/marcus",
      period: "Today",
    },
    {
      id: "a2",
      category: "saved",
      title: "Bookmarked post by @sophiachen",
      description: "Saved 'Next.js 16 Glassmorphic Design Token system'",
      timestamp: "2 hours ago",
      icon: <Bookmark className="h-4 w-4 text-purple-400" />,
      link: "/saved",
      period: "Today",
    },
    {
      id: "a3",
      category: "privacy",
      title: "Updated location privacy mode",
      description: "Switched location visibility to Approximate Blur (1km)",
      timestamp: "Yesterday",
      icon: <MapPin className="h-4 w-4 text-blue-400" />,
      link: "/map",
      period: "Yesterday",
    },
    {
      id: "a4",
      category: "social",
      title: "Liked post by @davidk",
      description: "You liked 'Building modern responsive web apps'",
      timestamp: "3 days ago",
      icon: <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />,
      link: "/feed",
      period: "Earlier",
    },
  ];

  const filteredEvents = activityEvents.filter((ev) => {
    if (activeTab === "all") return true;
    return ev.category === activeTab;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white gradient-text">Personal Activity History</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Chronological record of your social interactions, bookmarks, and privacy updates
        </p>
      </div>

      <Tabs tabs={activityTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Activity Timeline List */}
      <div className="space-y-4">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <Card
              key={event.id}
              className="glass-panel p-4 border-white/10 flex items-start gap-3.5 hover:border-purple-500/30 transition-all"
            >
              <div className="p-2.5 rounded-2xl glass-card border border-white/10 text-white shrink-0 mt-0.5">
                {event.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-xs text-white truncate">{event.title}</h4>
                  <span className="text-[10px] text-muted-foreground shrink-0">{event.timestamp}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.description}</p>

                <div className="mt-2.5">
                  <Link href={event.link} className="text-[11px] font-semibold text-purple-300 hover:underline">
                    View Context →
                  </Link>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 glass-panel rounded-2xl border border-white/10 space-y-2">
            <Clock className="h-8 w-8 text-purple-400 mx-auto opacity-40" />
            <p className="text-xs font-bold text-white">No activity in this filter</p>
            <p className="text-[11px] text-muted-foreground">Your recent social history will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
