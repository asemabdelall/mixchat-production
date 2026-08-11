"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Only register service worker in browser environment
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[PWA] New Mix Chat update available.");
              }
            };
          }
        });
      } catch (error) {
        console.warn("[PWA] ServiceWorker registration failed:", error);
      }
    };

    // Delay SW registration until page load completes for optimal LCP
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW, { once: true });
    }

    // Non-intrusive install prompt capture
    const handleBeforeInstallPrompt = (e: Event) => {
      // Store event globally on window if custom install UI is requested later
      (window as unknown as { deferredPwaInstallPrompt?: Event }).deferredPwaInstallPrompt = e;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}
