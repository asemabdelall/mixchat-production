export const POST_BACKGROUND_THEMES = [
  {
    id: "sunset",
    label: "Sunset",
    className:
      "bg-gradient-to-br from-rose-600 via-orange-500 to-amber-400 text-white",
  },
  {
    id: "velvet",
    label: "Velvet",
    className:
      "bg-gradient-to-br from-violet-900 via-indigo-950 to-fuchsia-900 text-white",
  },
  {
    id: "cyber",
    label: "Cyber",
    className:
      "bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-950 text-white",
  },
  {
    id: "neon",
    label: "Neon",
    className:
      "bg-gradient-to-br from-fuchsia-600 via-pink-600 to-rose-500 text-white",
  },
  {
    id: "emerald",
    label: "Emerald",
    className:
      "bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-950 text-white",
  },
] as const;

export type PostBackgroundThemeId =
  (typeof POST_BACKGROUND_THEMES)[number]["id"];

export function getPostBackgroundTheme(theme?: string | null) {
  return POST_BACKGROUND_THEMES.find((candidate) => candidate.id === theme);
}

