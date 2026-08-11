import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mix Chat - Next-Gen Modern Social Platform",
    short_name: "Mix Chat",
    description:
      "Experience the next level of social communication. Feed, Stories, Encrypted Private & Anonymous Chat, HD Voice & Video Calls, Live Map, and VIP Creator Tools.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0718",
    theme_color: "#0b0718",
    orientation: "portrait",
    categories: ["social", "messaging", "entertainment"],
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
