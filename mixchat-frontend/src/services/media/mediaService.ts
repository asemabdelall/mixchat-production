import { apiClient } from "../api/apiClient";
import type { components } from "../api/types/api.generated";

export type MediaKind = components["schemas"]["CreateUploadIntentDto"]["kind"];
export type CreateUploadIntentDto =
  components["schemas"]["CreateUploadIntentDto"];
export type UploadIntentResponseDto =
  components["schemas"]["UploadIntentResponseDto"];
export type CompleteUploadDto = components["schemas"]["CompleteUploadDto"];
export type MediaObjectDto = components["schemas"]["MediaObjectDto"];
export type SimpleMessageResponseDto =
  components["schemas"]["SimpleMessageResponseDto"];

export interface DirectUploadOptions {
  file: File;
  kind?: MediaKind;
  onProgress?: (progressPercent: number) => void;
  signal?: AbortSignal;
  durationMs?: number;
}

export const mediaService = {
  /**
   * Request a short-lived presigned upload URL for direct client PUT
   */
  async createUploadIntent(
    data: CreateUploadIntentDto,
  ): Promise<UploadIntentResponseDto> {
    return apiClient.post<UploadIntentResponseDto>(
      "/media/upload-intents",
      data,
    );
  },

  /**
   * Finalize and verify direct upload via HeadObject in R2
   */
  async completeUpload(
    mediaId: string,
    data: CompleteUploadDto = {},
  ): Promise<MediaObjectDto> {
    return apiClient.post<MediaObjectDto>(`/media/${mediaId}/complete`, data);
  },

  /**
   * Delete media object from R2 and PostgreSQL
   */
  async deleteMedia(mediaId: string): Promise<SimpleMessageResponseDto> {
    return apiClient.delete<SimpleMessageResponseDto>(`/media/${mediaId}`);
  },

  /**
   * Full client upload flow:
   * 1. Extract file metadata (dimensions if image)
   * 2. Request upload intent (presigned URL)
   * 3. PUT binary directly to R2 with real XMLHttpRequest progress & cancellation
   * 4. Finalize upload with NestJS
   */
  async uploadFile(options: DirectUploadOptions): Promise<MediaObjectDto> {
    const { file, kind = "IMAGE", onProgress, signal, durationMs } = options;

    // 1. Extract advisory dimensions if image
    let width: number | undefined;
    let height: number | undefined;

    if (file.type.startsWith("image/")) {
      try {
        const dimensions = await extractImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;
      } catch {
        // Advisory metadata only; continue if extraction fails
      }
    }

    // 2. Create upload intent
    const intent = await this.createUploadIntent({
      filename: file.name,
      mimeType: file.type || "image/jpeg",
      sizeBytes: file.size,
      kind,
    });

    // 3. Perform direct PUT to R2 presigned URL
    await uploadBinaryDirectToStorage({
      url: intent.upload.url,
      file,
      contentType: intent.upload.headers["Content-Type"] || file.type,
      onProgress,
      signal,
    });

    // 4. Finalize and verify in NestJS
    const finalizedMedia = await this.completeUpload(intent.media.id, {
      width,
      height,
      durationMs,
    });

    return finalizedMedia;
  },
};

/**
 * Extracts image width and height using HTMLImageElement
 */
function extractImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Window not available"));
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Uploads raw binary directly to Cloudflare R2 / S3 via XMLHttpRequest
 * to support fine-grained progress reporting and instant cancellation.
 */
function uploadBinaryDirectToStorage(options: {
  url: string;
  file: File;
  contentType: string;
  onProgress?: (progressPercent: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", options.url, true);
    xhr.setRequestHeader("Content-Type", options.contentType);

    if (options.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(100);
        resolve();
      } else {
        reject(
          new Error(
            `Direct storage upload failed with status ${xhr.status}: ${xhr.statusText}`,
          ),
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during direct binary storage upload"));
    };

    xhr.onabort = () => {
      reject(new DOMException("Upload aborted by user", "AbortError"));
    };

    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return reject(new DOMException("Upload aborted by user", "AbortError"));
      }
      options.signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.send(options.file);
  });
}

export default mediaService;
