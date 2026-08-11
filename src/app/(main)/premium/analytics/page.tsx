"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, Eye, Users, Heart, MapPin, ArrowUpRight, BarChart3, Award, ArrowLeft } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

export default function PlusAnalyticsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link href="/premium" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Premium</span>
        </Link>
        <span className="flex items-center gap-1 text-xs font-bold gradient-text">
          <Sparkles className="h-4 w-4 text-purple-400" />
          Mix Plus Analytics
        </span>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Social Performance</h1>
        <p className="text-xs text-muted-foreground">Track your reach, story views, and profile growth in real-time</p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-panel p-4 border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Profile Visits</span>
            <div className="p-1.5 rounded-lg gradient-bg-primary text-white">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white">12,480</p>
          <span className="text-[11px] text-emerald-400 flex items-center gap-0.5 font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5" /> +24% this week
          </span>
        </Card>

        <Card className="glass-panel p-4 border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Story Reach</span>
            <div className="p-1.5 rounded-lg gradient-bg-accent text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white">34,910</p>
          <span className="text-[11px] text-emerald-400 flex items-center gap-0.5 font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5" /> +18% this week
          </span>
        </Card>

        <Card className="glass-panel p-4 border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Follower Growth</span>
            <div className="p-1.5 rounded-lg bg-blue-600 text-white">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white">+680</p>
          <span className="text-[11px] text-emerald-400 flex items-center gap-0.5 font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5" /> +8.4%
          </span>
        </Card>

        <Card className="glass-panel p-4 border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Post Likes</span>
            <div className="p-1.5 rounded-lg bg-pink-600 text-white">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white">18.4K</p>
          <span className="text-[11px] text-emerald-400 flex items-center gap-0.5 font-semibold">
            <ArrowUpRight className="h-3.5 w-3.5" /> +32%
          </span>
        </Card>
      </div>

      {/* Visual Chart Bars (Youthful & Vibrant) */}
      <Card className="glass-panel p-6 border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            <span>Weekly Engagement Activity</span>
          </h3>
          <span className="text-[11px] text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-full font-semibold">
            Last 7 Days
          </span>
        </div>

        {/* Simulated Bar Chart */}
        <div className="flex items-end justify-between gap-2 h-44 pt-6">
          {[
            { day: "Mon", height: "45%", count: "2.4k" },
            { day: "Tue", height: "60%", count: "3.8k" },
            { day: "Wed", height: "85%", count: "5.2k" },
            { day: "Thu", height: "70%", count: "4.1k" },
            { day: "Fri", height: "95%", count: "6.8k" },
            { day: "Sat", height: "100%", count: "7.4k" },
            { day: "Sun", height: "80%", count: "4.9k" },
          ].map((bar, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {bar.count}
              </span>
              <div
                style={{ height: bar.height }}
                className="w-full rounded-t-xl gradient-bg-primary group-hover:gradient-bg-accent transition-all duration-300 shadow-md"
              />
              <span className="text-xs text-muted-foreground font-semibold">{bar.day}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Cities & Best Performing Content Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="glass-panel p-6 border-white/10 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <MapPin className="h-4 w-4 text-purple-400" />
            <span>Top Audience Cities</span>
          </h3>

          <div className="space-y-3 text-xs">
            {[
              { city: "San Francisco, CA", pct: "38%" },
              { city: "New York, NY", pct: "24%" },
              { city: "London, UK", pct: "16%" },
              { city: "Tokyo, Japan", pct: "12%" },
            ].map((loc, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span className="text-white font-medium">{loc.city}</span>
                  <span>{loc.pct}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full gradient-bg-primary rounded-full" style={{ width: loc.pct }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-panel p-6 border-white/10 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-pink-400" />
            <span>Best Performing Story</span>
          </h3>

          <div className="flex items-center gap-3 glass-card p-3 rounded-2xl border border-white/10">
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80"
              alt="Story"
              className="w-16 h-20 object-cover rounded-xl shrink-0"
            />
            <div>
              <p className="font-bold text-xs text-white">New 3D shader experiment in progress!</p>
              <p className="text-[11px] text-purple-300 mt-1">1,240 Views • 482 Likes</p>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">25m ago</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
