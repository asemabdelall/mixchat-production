"use client";

import { useState, useCallback, useRef } from "react";
import {
  mediaService,
  MediaKind,
  MediaObjectDto,
} from "@/services/media/mediaService";

export type UploadStatus =
  | "idle"
  | "validating"
  | "requesting-intent"
  | "uploading"
  | "finalizing"
  | "success"
  | "error"
  | "cancelled";

export interface UseMediaUploadOptions {
  kind?: MediaKind;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  onSuccess?: (media: MediaObjectDto) => void;
  onError?: (error: Error) => void;
}

export function useMediaUpload(options: UseMediaUploadOptions = {}) {
  const {
    kind = "IMAGE",
    maxSizeBytes = 10 * 1024 * 1024, // 10MB
    allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"],
    onSuccess,
    onError,
  } = options;

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<MediaObjectDto | null>(
    null,
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus("cancelled");
      setProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setUploadedMedia(null);
    abortControllerRef.current = null;
  }, []);

  const upload = useCallback(
    async (file: File): Promise<MediaObjectDto | null> => {
      setError(null);
      setProgress(0);
      setStatus("validating");

      // 1. Client validation
      if (
        allowedMimeTypes.length > 0 &&
        !allowedMimeTypes.includes(file.type)
      ) {
        const err = new Error(
          `Invalid file format: ${file.type}. Allowed formats: ${allowedMimeTypes.join(", ")}`,
        );
        setError(err.message);
        setStatus("error");
        onError?.(err);
        return null;
      }

      if (file.size > maxSizeBytes) {
        const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
        const err = new Error(
          `File exceeds maximum permitted size of ${maxMb}MB (${file.size} bytes).`,
        );
        setError(err.message);
        setStatus("error");
        onError?.(err);
        return null;
      }

      // 2. Setup cancellation
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setStatus("requesting-intent");

        const media = await mediaService.uploadFile({
          file,
          kind,
          onProgress: (percent) => {
            setProgress(percent);
            if (percent > 0 && percent < 100) {
              setStatus("uploading");
            } else if (percent === 100) {
              setStatus("finalizing");
            }
          },
          signal: controller.signal,
        });

        setUploadedMedia(media);
        setStatus("success");
        onSuccess?.(media);
        return media;
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          setStatus("cancelled");
          return null;
        }

        const msg =
          (err as Error)?.message || "Media upload failed. Please try again.";
        setError(msg);
        setStatus("error");
        onError?.(err as Error);
        return null;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [kind, maxSizeBytes, allowedMimeTypes, onSuccess, onError],
  );

  return {
    upload,
    cancel,
    reset,
    status,
    progress,
    error,
    uploadedMedia,
    isUploading:
      status === "requesting-intent" ||
      status === "uploading" ||
      status === "finalizing",
  };
}
