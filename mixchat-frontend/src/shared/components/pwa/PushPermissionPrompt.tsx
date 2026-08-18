"use client";

import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { useAuth } from "@/shared/providers/AuthProvider";
import { useNotifications } from "@/shared/providers/NotificationsProvider";

const DISMISSED_AT_KEY = "mixchat_push_permission_prompt_dismissed_at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed(): boolean {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY));
    return (
      Number.isFinite(dismissedAt) &&
      dismissedAt > 0 &&
      Date.now() - dismissedAt < DISMISS_DURATION_MS
    );
  } catch {
    return false;
  }
}

export function PushPermissionPrompt() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const {
    isPushSupported,
    permissionState,
    isPushSubscribed,
    enablePush,
    updatePreferences,
  } = useNotifications();
  const [isReady, setIsReady] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return wasRecentlyDismissed();
  });
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = window.setTimeout(() => setIsReady(true), 1800);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  const dismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {
      // Storage can be unavailable in restricted browser modes.
    }
  };

  const enable = async () => {
    setIsEnabling(true);
    setError(null);

    try {
      const success = await enablePush();
      if (!success) {
        setError(
          Notification.permission === "denied"
            ? "Notifications are blocked. Enable them from your browser or device settings."
            : "MixChat could not enable notifications on this device. Try again from Settings.",
        );
        return;
      }

      await updatePreferences({ pushEnabled: true });
      try {
        localStorage.removeItem(DISMISSED_AT_KEY);
      } catch {
        // The permission and subscription are already active.
      }
      setIsDismissed(true);
    } catch {
      setError("MixChat could not enable notifications. Please try again.");
    } finally {
      setIsEnabling(false);
    }
  };

  const shouldOpen =
    isReady &&
    isAuthenticated &&
    isPushSupported &&
    permissionState === "default" &&
    !isPushSubscribed &&
    !isDismissed &&
    pathname !== "/settings/notifications";

  return (
    <Modal
      isOpen={shouldOpen}
      onClose={dismiss}
      title="Turn on notifications"
      maxWidth="sm"
    >
      <div className="space-y-5">
        <div className="flex justify-center pt-1">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-purple-400/30 bg-gradient-to-br from-purple-500/25 via-fuchsia-500/15 to-blue-500/20 shadow-[0_0_45px_rgba(168,85,247,0.3)]">
            <BellRing className="h-9 w-9 text-purple-200" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#111728] bg-pink-500 text-xs font-black text-white">
              1
            </span>
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h4 className="text-xl font-black tracking-tight text-white">
            Stay connected to MixChat
          </h4>
          <p className="text-sm leading-6 text-slate-300">
            Get instant alerts for new messages, calls, comments, and activity
            even when the app is closed.
          </p>
        </div>

        <div className="grid gap-2.5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>You control notification categories from Settings.</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-sky-400" />
            <span>You can disable notifications at any time.</span>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-xs leading-5 text-rose-200"
          >
            {error}
          </p>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={dismiss}
            disabled={isEnabling}
            className="order-2 sm:order-1"
          >
            Not now
          </Button>
          <Button
            type="button"
            variant="gradient"
            onClick={() => void enable()}
            isLoading={isEnabling}
            className="order-1 sm:order-2"
          >
            Enable notifications
          </Button>
        </div>
      </div>
    </Modal>
  );
}
