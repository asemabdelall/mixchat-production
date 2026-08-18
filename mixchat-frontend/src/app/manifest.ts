import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MixChat — Share, discover, and connect",
    short_name: "Mix Chat",
    description:
      "Share posts and stories, discover creators, message friends, and control how your location is shared.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#090c15",
    theme_color: "#090c15",
    orientation: "portrait",
    categories: ["social", "messaging", "entertainment"],
    shortcuts: [
      {
        name: "Feed",
        short_name: "Feed",
        description: "Explore the latest posts & stories",
        url: "/feed",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Direct Messages",
        short_name: "Chat",
        description: "Open your conversations & messages",
        url: "/chat",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Reels",
        short_name: "Reels",
        description: "Watch trending vertical video reels",
        url: "/reels",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Map",
        short_name: "Map",
        description: "View locations shared by your friends",
        url: "/map",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
