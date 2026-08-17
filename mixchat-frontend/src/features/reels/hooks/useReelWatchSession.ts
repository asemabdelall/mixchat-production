"use client";

import { useEffect, useRef, useCallback } from "react";
import { reelsService } from "@/services/reels/reelsService";

interface UseReelWatchSessionOptions {
  reelId: string;
  isActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onQualifiedView?: () => void;
}

export function useReelWatchSession({
  reelId,
  isActive,
  videoRef,
  onQualifiedView,
}: UseReelWatchSessionOptions) {
  const sessionIdRef = useRef<string>("");

  const watchedMsRef = useRef<number>(0);
  const maxProgressMsRef = useRef<number>(0);
  const lastPlayTimestampRef = useRef<number | null>(null);
  const isQualifiedRef = useRef<boolean>(false);
  const isCompletedRef = useRef<boolean>(false);
  const checkpointTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to accumulate watched time
  const accumulateTime = useCallback(() => {
    if (lastPlayTimestampRef.current !== null) {
      const now = Date.now();
      const delta = now - lastPlayTimestampRef.current;
      watchedMsRef.current += Math.max(0, delta);
      lastPlayTimestampRef.current = now;
    }

    if (videoRef.current) {
      const currentMs = Math.round(videoRef.current.currentTime * 1000);
      maxProgressMsRef.current = Math.max(maxProgressMsRef.current, currentMs);
    }
  }, [videoRef]);

  // Send progress checkpoint to backend
  const sendCheckpoint = useCallback(
    async (isEnding = false) => {
      accumulateTime();
      if (!reelId || watchedMsRef.current <= 0) return;

      const durationMs = videoRef.current
        ? Math.round((videoRef.current.duration || 0) * 1000)
        : 0;

      const completionRatio =
        durationMs > 0
          ? Math.min(1.0, maxProgressMsRef.current / durationMs)
          : 0;

      const payload = {
        sessionId: sessionIdRef.current,
        watchedMs: watchedMsRef.current,
        maxProgressMs: maxProgressMsRef.current,
        durationMs,
        completionRatio,
      };

      try {
        if (isEnding) {
          const res = await reelsService.watchEnd(reelId, {
            ...payload,
            isCompleted: isCompletedRef.current || completionRatio >= 0.9,
          });
          if (res.isQualifiedView && !isQualifiedRef.current) {
            isQualifiedRef.current = true;
            onQualifiedView?.();
          }
        } else {
          const res = await reelsService.watchProgress(reelId, payload);
          if (res.isQualifiedView && !isQualifiedRef.current) {
            isQualifiedRef.current = true;
            onQualifiedView?.();
          }
          if (res.isCompleted) {
            isCompletedRef.current = true;
          }
        }
      } catch {
        // Watch telemetry is best effort and retried on the next checkpoint.
      }
    },
    [accumulateTime, reelId, videoRef, onQualifiedView],
  );

  // Handle active state changes
  useEffect(() => {
    if (isActive) {
      // New session ID for each distinct active viewing
      sessionIdRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      watchedMsRef.current = 0;
      maxProgressMsRef.current = 0;
      isQualifiedRef.current = false;
      isCompletedRef.current = false;
      lastPlayTimestampRef.current = Date.now();

      void reelsService
        .watchStart(reelId, sessionIdRef.current)
        .catch(() => {});

      // Setup periodic checkpoint every 3.5 seconds
      checkpointTimerRef.current = setInterval(() => {
        void sendCheckpoint(false);
      }, 3500);
    } else {
      if (checkpointTimerRef.current) {
        clearInterval(checkpointTimerRef.current);
        checkpointTimerRef.current = null;
      }
      if (watchedMsRef.current > 0) {
        void sendCheckpoint(true);
      }
      lastPlayTimestampRef.current = null;
    }

    return () => {
      if (checkpointTimerRef.current) {
        clearInterval(checkpointTimerRef.current);
        checkpointTimerRef.current = null;
      }
    };
  }, [isActive, reelId, sendCheckpoint]);

  // Video event handlers
  const handlePlay = useCallback(() => {
    lastPlayTimestampRef.current = Date.now();
  }, []);

  const handlePause = useCallback(() => {
    accumulateTime();
    lastPlayTimestampRef.current = null;
  }, [accumulateTime]);

  const handleEnded = useCallback(() => {
    accumulateTime();
    isCompletedRef.current = true;
    void sendCheckpoint(false);
  }, [accumulateTime, sendCheckpoint]);

  return {
    handlePlay,
    handlePause,
    handleEnded,
    finalizeSession: () => sendCheckpoint(true),
  };
}
