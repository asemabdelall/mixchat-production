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
          updateViaCache: "none",
        });
        await registration.update().catch(() => {});
      } catch {
        // The app remains usable when service worker registration is unavailable.
      }
    };

    // Delay SW registration until page load completes for optimal LCP
    if (document.readyState === "complete") {
      void registerSW();
    } else {
      window.addEventListener("load", registerSW, { once: true });
    }

    return () => {
      window.removeEventListener("load", registerSW);
    };
  }, []);

  return null;
}
