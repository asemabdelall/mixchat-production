"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Shield, QrCode, Smile, HardDrive, HelpCircle, LogOut, ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from "@/shared/providers/AuthProvider";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const settingsGroups = [
    {
      title: "Account & Profile",
      items: [
        { label: "Edit Profile", icon: User, href: "/profile/edit", desc: "Avatar, cover, name, bio" },
        { label: "My QR Code", icon: QrCode, href: "/settings/qrcode", desc: "Share profile QR card" },
        { label: "42 Status", icon: Smile, href: "/settings/status", desc: "Set custom or preset status" },
      ],
    },
    {
      title: "Privacy & Controls",
      items: [
        { label: "Privacy & Security", icon: Shield, href: "/settings/privacy", desc: "Last seen, Ghost mode, 2FA" },
        { label: "Data & Storage", icon: HardDrive, href: "/settings/storage", desc: "Data saver, clear cache" },
      ],
    },
    {
      title: "Support & About",
      items: [
        { label: "Help & Support", icon: HelpCircle, href: "/settings/help", desc: "FAQs, contact support" },
        { label: "Mix Chat Plus VIP", icon: Sparkles, href: "/premium", desc: "Manage VIP subscription" },
      ],
    },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      {/* User Header Profile Card */}
      <Card className="glass-panel p-5 border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <Avatar src={user?.avatar || ""} alt={user?.displayName || "User"} size="lg" online={true} isVerified={user?.role === "verified"} />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-extrabold text-base text-white">{user?.displayName || "Alex Vance"}</h2>
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-xs text-purple-300">@{user?.username || "alexvance"}</p>
          </div>
        </div>

        <Link href="/profile">
          <Button size="xs" variant="glass">
            View Profile
          </Button>
        </Link>
      </Card>

      {/* Settings Navigation List */}
      <div className="space-y-6">
        {settingsGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
              {group.title}
            </h3>

            <Card className="glass-panel p-0 border-white/10 overflow-hidden divide-y divide-white/5">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl glass-card text-purple-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white">{item.label}</h4>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </Card>
          </div>
        ))}

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="destructive"
          size="lg"
          className="w-full h-12 gap-2 font-bold shadow-lg"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out of Mix Chat</span>
        </Button>
      </div>
    </div>
  );
}
