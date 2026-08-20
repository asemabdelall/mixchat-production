"use client";

import { useEffect } from "react";

const PWA_DISPLAY_MODE_QUERY =
  "(display-mode: standalone), (display-mode: fullscreen)";
const PINCH_ZOOM_EXCEPTION = "[data-pwa-allow-pinch-zoom]";

const isInsideZoomException = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest(PINCH_ZOOM_EXCEPTION));

const lockViewportZoom = (content: string) => {
  const directives = content
    .split(",")
    .map((directive) => directive.trim())
    .filter(
      (directive) =>
        !directive.toLowerCase().startsWith("maximum-scale") &&
        !directive.toLowerCase().startsWith("user-scalable"),
    );

  return [...directives, "maximum-scale=1", "user-scalable=no"].join(", ");
};

export function PwaZoomGuard() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia(PWA_DISPLAY_MODE_QUERY).matches ||
      window.navigator.standalone === true;

    if (!isStandalone) return;

    const viewportMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );
    const originalViewportContent = viewportMeta?.content;

    if (viewportMeta) {
      viewportMeta.content = lockViewportZoom(viewportMeta.content);
    }

    document.documentElement.dataset.pwaZoomLocked = "true";

    const preventGestureZoom = (event: Event) => {
      if (!isInsideZoomException(event.target)) event.preventDefault();
    };

    const preventMultiTouchZoom = (event: TouchEvent) => {
      if (
        event.touches.length > 1 &&
        !isInsideZoomException(event.target)
      ) {
        event.preventDefault();
      }
    };

    const preventTrackpadZoom = (event: WheelEvent) => {
      if (event.ctrlKey && !isInsideZoomException(event.target)) {
        event.preventDefault();
      }
    };

    const preventKeyboardZoom = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        ["+", "-", "=", "0"].includes(event.key)
      ) {
        event.preventDefault();
      }
    };

    const nonPassive: AddEventListenerOptions = { passive: false };
    document.addEventListener("gesturestart", preventGestureZoom, nonPassive);
    document.addEventListener("gesturechange", preventGestureZoom, nonPassive);
    document.addEventListener("touchmove", preventMultiTouchZoom, nonPassive);
    document.addEventListener("wheel", preventTrackpadZoom, nonPassive);
    document.addEventListener("dblclick", preventGestureZoom, nonPassive);
    document.addEventListener("keydown", preventKeyboardZoom);

    return () => {
      if (viewportMeta && originalViewportContent !== undefined) {
        viewportMeta.content = originalViewportContent;
      }
      delete document.documentElement.dataset.pwaZoomLocked;
      document.removeEventListener("gesturestart", preventGestureZoom, false);
      document.removeEventListener("gesturechange", preventGestureZoom, false);
      document.removeEventListener("touchmove", preventMultiTouchZoom, false);
      document.removeEventListener("wheel", preventTrackpadZoom, false);
      document.removeEventListener("dblclick", preventGestureZoom, false);
      document.removeEventListener("keydown", preventKeyboardZoom);
    };
  }, []);

  return null;
}
