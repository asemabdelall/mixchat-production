"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, HardDrive, Trash2 } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { useAuth } from "@/shared/providers/AuthProvider";
import { offlineStorage } from "@/services/storage/offlineStorage";

export default function StorageSettingsPage() {
  const { user } = useAuth();
  const [cleared, setCleared] = useState(false);

  const handleClearLocalData = async () => {
    offlineStorage.clearUserOfflineData(user?.id);
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith("mixchat-static-"))
          .map((name) => caches.delete(name)),
      );
    }
    setCleared(true);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-xl font-bold text-white">Data & Storage</h1>
        <div className="w-16" aria-hidden="true" />
      </div>

      <Card className="glass-panel space-y-4 border-white/10 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-purple-500/15 p-2 text-purple-300">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Local offline data</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              MixChat may keep recent feed items and unfinished drafts on this
              device. Clearing them does not delete posts, messages, or account
              data stored on the server.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => void handleClearLocalData()}
          variant="glass"
          className="w-full gap-2 text-rose-300"
        >
          {cleared ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          {cleared ? "Local data cleared" : "Clear local offline data"}
        </Button>
      </Card>
    </div>
  );
}
