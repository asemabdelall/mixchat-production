"use client";

import React from "react";
import Link from "next/link";
import { Zap, Users, Film } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { MOCK_USERS, MOCK_STORIES } from "@/shared/services/mockData";

export const MixPulseWidget: React.FC = () => {
  const onlineFriends = MOCK_USERS.filter((u) => u.online);

  return (
    <Card className="glass-panel p-4 border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-background to-indigo-900/20 shadow-xl overflow-hidden relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl gradient-bg-primary text-white shadow-md shadow-purple-500/30 animate-pulse">
            <Zap className="h-5 w-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-white">MIX PULSE</h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                LIVE NOW
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-bold text-purple-300">{onlineFriends.length} friends online</span> •{" "}
              <span>{MOCK_STORIES.length} location stories</span> •{" "}
              <span className="text-orange-400 font-semibold">#MixChatUI trending</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link href="/map" className="glass-card px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-white hover:border-purple-500/40 transition-colors flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-purple-400" />
            <span>View Map</span>
          </Link>
          <Link href="/stories" className="glass-card px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-white hover:border-purple-500/40 transition-colors flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-purple-400" />
            <span>Stories</span>
          </Link>
        </div>
      </div>
    </Card>
  );
};
