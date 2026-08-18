"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  Heart,
  MessageCircle,
  MessageSquare,
  UserPlus,
  AtSign,
  Eye,
  Check,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { useNotifications } from "@/shared/providers/NotificationsProvider";
import { PwaInstallPrompt } from "@/shared/components/pwa/PwaInstallPrompt";
import { Switch } from "@/shared/components/ui/Switch";

export default function NotificationSettingsPage() {
  const {
    isPushSupported,
    permissionState,
    isPushSubscribed,
    preferences,
    enablePush,
    disablePush,
    sendTestPush,
    updatePreferences,
  } = useNotifications();

  const [isEnabling, setIsEnabling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSendTestPush = async () => {
    setIsTesting(true);
    try {
      const success = await sendTestPush();
      showToast(
        success
          ? "Test notification delivered to device ✓"
          : "No active device received the test notification",
      );
    } catch {
      showToast("Failed to send test push notification");
    } finally {
      setIsTesting(false);
    }
  };

  const handleTogglePush = async () => {
    setIsEnabling(true);
    try {
      if (isPushSubscribed) {
        await disablePush();
        await updatePreferences({ pushEnabled: false });
        showToast("Web Push notifications disabled");
      } else {
        const success = await enablePush();
        if (success) {
          await updatePreferences({ pushEnabled: true });
          showToast("Web Push notifications enabled ✓");
        } else {
          showToast(
            permissionState === "denied"
              ? "Notifications are blocked in your browser settings"
              : "Could not enable push notifications",
          );
        }
      }
    } catch {
      showToast("Failed to update push status");
    } finally {
      setIsEnabling(false);
    }
  };

  const handleTogglePref = async (
    key:
      | "socialPush"
      | "likesPush"
      | "commentsPush"
      | "mentionsPush"
      | "messagesPush"
      | "showMessagePreview",
    currentVal: boolean,
  ) => {
    try {
      await updatePreferences({ [key]: !currentVal });
      showToast("Preferences saved");
    } catch {
      showToast("Could not save preferences");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="p-2 rounded-xl glass-card text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">
            Notifications & Web Push
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage browser push alerts and in-app notification preferences
          </p>
        </div>
      </div>

      {/* Toast Banner */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-purple-600/90 text-white text-xs font-bold shadow-lg shadow-purple-900/30 flex items-center gap-2 animate-in fade-in">
          <Check className="h-4 w-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Web Push Main Card */}
      <Card className="glass-panel p-5 border-white/10 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl gradient-bg-primary text-white shrink-0 mt-0.5">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Browser Web Push
                {isPushSubscribed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Active
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Receive instant notifications on your desktop or mobile device
                even when MixChat is closed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPushSubscribed && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleSendTestPush()}
                disabled={isTesting}
                className="font-bold text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                {isTesting ? "Sending..." : "Test Push"}
              </Button>
            )}
            <Button
              size="sm"
              variant={isPushSubscribed ? "outline" : "gradient"}
              onClick={() => void handleTogglePush()}
              disabled={
                isEnabling || !isPushSupported || permissionState === "denied"
              }
              className="font-bold text-xs"
            >
              {isEnabling
                ? "Updating..."
                : isPushSubscribed
                  ? "Disable"
                  : "Enable Push"}
            </Button>
          </div>
        </div>

        {/* PWA Install Promotion */}
        <PwaInstallPrompt variant="card" />

        {/* Permission Warnings */}
        {!isPushSupported ? (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>Web Push is not supported by your current browser.</span>
          </div>
        ) : permissionState === "denied" ? (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Notifications are blocked in your browser settings. Please enable
              notifications in your browser permissions to receive push alerts.
            </span>
          </div>
        ) : null}
      </Card>

      {/* Push Notification Categories */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
          Delivery Channels & Categories
        </h3>

        <Card className="glass-panel p-0 border-white/10 overflow-hidden divide-y divide-white/5">
          {/* Messages */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl glass-card text-blue-400">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">
                  Direct Messages
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Alerts for incoming 1-on-1 and group chat messages
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.messagesPush ?? true}
              onCheckedChange={() => void handleTogglePref("messagesPush", preferences?.messagesPush ?? true)}
              label="Direct message push notifications"
              disabled={!preferences}
            />
          </div>

          {/* Message Preview */}
          <div className="flex items-center justify-between p-4 bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl glass-card text-cyan-400">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">
                  Show Message Previews
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Display text content in lock screen push notifications
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.showMessagePreview ?? true}
              onCheckedChange={() => void handleTogglePref("showMessagePreview", preferences?.showMessagePreview ?? true)}
              label="Show message previews"
              disabled={!preferences}
            />
          </div>

          {/* Social */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl glass-card text-emerald-400">
                <UserPlus className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">
                  Social & Follows
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  New followers and follow requests
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.socialPush ?? true}
              onCheckedChange={() => void handleTogglePref("socialPush", preferences?.socialPush ?? true)}
              label="Social push notifications"
              disabled={!preferences}
            />
          </div>

          {/* Likes */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl glass-card text-pink-400">
                <Heart className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">
                  Likes & Reposts
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Likes on your posts, comments, and reels
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.likesPush ?? true}
              onCheckedChange={() => void handleTogglePref("likesPush", preferences?.likesPush ?? true)}
              label="Like and repost push notifications"
              disabled={!preferences}
            />
          </div>

          {/* Comments */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl glass-card text-purple-400">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">
                  Comments & Replies
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Comments and threaded discussion replies
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.commentsPush ?? true}
              onCheckedChange={() => void handleTogglePref("commentsPush", preferences?.commentsPush ?? true)}
              label="Comment and reply push notifications"
              disabled={!preferences}
            />
          </div>

          {/* Mentions */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl glass-card text-amber-400">
                <AtSign className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">
                  Mentions & Tags
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Direct @username mentions in comments or posts
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.mentionsPush ?? true}
              onCheckedChange={() => void handleTogglePref("mentionsPush", preferences?.mentionsPush ?? true)}
              label="Mention push notifications"
              disabled={!preferences}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
