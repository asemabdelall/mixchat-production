import type { NextConfig } from "next";

const apiOrigin = new URL(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
).origin;
const websocketOrigin = new URL(
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000",
).origin.replace(/^http/, "ws");
const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'" + (isProduction ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data: https://tiles.openfreemap.org",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  `connect-src 'self' ${apiOrigin} ${websocketOrigin} https://tiles.openfreemap.org https://*.r2.cloudflarestorage.com wss://*.livekit.cloud https://*.livekit.cloud wss://mixchat-rvk2mq8j.livekit.cloud https://mixchat-rvk2mq8j.livekit.cloud`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(self)",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    localPatterns: [
      {
        pathname: "/**",
        search: "",
      },
      {
        pathname: "/**",
        search: "?*",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudflarestream.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.livekit.cloud",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
