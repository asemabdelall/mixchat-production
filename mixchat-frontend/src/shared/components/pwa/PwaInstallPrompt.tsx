"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    deferredPwaInstallPrompt?: BeforeInstallPromptEvent;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

export const PwaInstallPrompt: React.FC<{
  variant?: "banner" | "button" | "card";
  className?: string;
}> = ({ variant = "banner", className = "" }) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => {
      if (typeof window === "undefined") return null;
      return window.deferredPwaInstallPrompt || null;
    });

  const [isStandalone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  });

  const [isIos] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  });

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("mixchat_pwa_install_dismissed") === "true";
  });

  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.deferredPwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        setDismissed(true);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("mixchat_pwa_install_dismissed", "true");
    } catch {
      // ignore
    }
  };

  // If already standalone or dismissed and not explicit button/card, hide
  if (isStandalone) return null;
  if (dismissed && variant === "banner") return null;
  if (!deferredPrompt && !isIos && variant === "banner") return null;

  if (variant === "button") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleInstallClick}
        className={`flex items-center gap-2 border-purple-500/30 hover:border-purple-500/60 text-xs font-semibold ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-purple-400" />
        <span>Install App</span>
      </Button>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-transparent border border-purple-500/20 space-y-3 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Install MixChat
              </h4>
              <p className="text-xs text-muted-foreground">
                Fast, offline-ready standalone social app
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="shadow-md shadow-purple-500/20"
          >
            Install
          </Button>
        </div>

        {showIosGuide && (
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white/90 space-y-2">
            <p className="font-semibold text-purple-300">
              How to install on iOS:
            </p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Share className="w-4 h-4 text-white" />
              <span>1. Tap the Share button in Safari toolbar</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <PlusSquare className="w-4 h-4 text-white" />
              <span>2. Select &ldquo;Add to Home Screen&rdquo;</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default subtle banner
  return (
    <div
      role="status"
      className={`mx-4 my-2 p-3.5 rounded-2xl glass-panel border-purple-500/20 flex items-center justify-between gap-3 shadow-xl ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
          <Download className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-xs">
          <p className="font-semibold text-white">Install MixChat App</p>
          <p className="text-muted-foreground text-[11px]">
            Install on your home screen for the full app experience
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleInstallClick}
          className="px-3 text-xs font-semibold"
        >
          Install
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-white transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
