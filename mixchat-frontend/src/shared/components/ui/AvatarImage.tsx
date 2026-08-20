"use client";

import React from "react";
import {
  applyDefaultAvatar,
  resolveAvatarUrl,
} from "@/shared/constants/avatar";

export interface AvatarImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: unknown;
}

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ src, alt = "Profile picture", onError, ...props }, ref) => (
    // Avatar URLs can come from user-controlled CDN providers.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={resolveAvatarUrl(src)}
      alt={alt}
      onError={(event) => {
        onError?.(event);
        if (!event.defaultPrevented) applyDefaultAvatar(event.currentTarget);
      }}
      {...props}
    />
  ),
);

AvatarImage.displayName = "AvatarImage";
