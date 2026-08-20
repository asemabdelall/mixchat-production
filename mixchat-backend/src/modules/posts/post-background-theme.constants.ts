export const POST_BACKGROUND_THEMES = [
  'sunset',
  'velvet',
  'cyber',
  'neon',
  'emerald',
] as const;

export type PostBackgroundTheme = (typeof POST_BACKGROUND_THEMES)[number];
