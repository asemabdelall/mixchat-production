"use client";

import React, { useRef } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { useMediaUpload, UseMediaUploadOptions } from "../hooks/useMediaUpload";
import { MediaObjectDto } from "@/services/media/mediaService";

interface MediaPickerProps extends UseMediaUploadOptions {
  label?: string;
  helperText?: string;
  accept?: string;
  currentPreviewUrl?: string | null;
  onMediaUploaded?: (media: MediaObjectDto) => void;
  className?: string;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  label = "Upload Media",
  helperText = "PNG, JPG, WebP up to 10MB",
  accept = "image/jpeg,image/png,image/webp,image/avif",
  currentPreviewUrl,
  onMediaUploaded,
  className = "",
  ...uploadOptions
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, cancel, isUploading, progress, status, error } =
    useMediaUpload({
      ...uploadOptions,
      onSuccess: (media) => {
        onMediaUploaded?.(media);
        uploadOptions.onSuccess?.(media);
      },
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await upload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-zinc-300">{label}</label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />

      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (!isUploading && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={isUploading ? -1 : 0}
        aria-disabled={isUploading}
        className={`relative border border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer overflow-hidden ${
          isUploading
            ? "border-purple-500/50 bg-purple-950/10 cursor-not-allowed"
            : "border-white/10 hover:border-purple-500/40 bg-white/[0.02] hover:bg-white/[0.04]"
        }`}
      >
        {currentPreviewUrl && !isUploading && (
          <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPreviewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
          </div>
        )}

        {!currentPreviewUrl && !isUploading && (
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <UploadCloud className="w-6 h-6" />
          </div>
        )}

        {isUploading ? (
          <div className="w-full flex flex-col items-center gap-2 max-w-xs">
            <div className="flex items-center justify-between w-full text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium text-purple-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {status === "requesting-intent" && "Authorizing upload..."}
                {status === "uploading" && `Uploading to R2... ${progress}%`}
                {status === "finalizing" && "Verifying media..."}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cancel();
                }}
                className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                title="Cancel upload"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Progress Track */}
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs font-medium text-zinc-200">
              Select a file to upload
            </p>
            {helperText && (
              <p className="text-[11px] text-zinc-500 mt-0.5">{helperText}</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
