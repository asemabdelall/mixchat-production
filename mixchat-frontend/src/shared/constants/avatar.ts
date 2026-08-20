export const DEFAULT_AVATAR_URL = "/default-avatar.svg";

export function resolveAvatarUrl(value?: unknown): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : DEFAULT_AVATAR_URL;
}

export function applyDefaultAvatar(image: HTMLImageElement): void {
  if (image.getAttribute("src") !== DEFAULT_AVATAR_URL) {
    image.src = DEFAULT_AVATAR_URL;
  }
}
