/* Mix Chat PWA Service Worker - Production Safe & Privacy Preserving */

const CACHE_NAME = "mixchat-static-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  "/",
  OFFLINE_URL,
  "/favicon.ico",
  "/mixchat-icon.png",
  "/mixchat-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/apple-touch-icon.png"
];

// Helper to determine if request is a private / dynamic API or websocket
function isPrivateOrDynamicRequest(url) {
  const path = url.pathname;
  return (
    url.protocol === "ws:" ||
    url.protocol === "wss:" ||
    path.startsWith("/api/") ||
    path.includes("/auth") ||
    path.includes("/login") ||
    path.includes("/register") ||
    path.includes("/verify-otp") ||
    path.includes("/_next/webpack-hmr") ||
    path.includes("/socket.io")
  );
}

// 1. Install Event - Precache core shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Clean up stale cache keys
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip non-http(s) requests (e.g. chrome-extension)
  if (!url.protocol.startsWith("http")) return;

  // Rule A: NEVER cache API, Auth, WebSocket, or HMR requests (Network Only)
  if (isPrivateOrDynamicRequest(url)) {
    return;
  }

  // Rule B: Page Navigation Requests -> Network First with Offline Fallback
  const isNavigation = event.request.mode === "navigate" || 
                       (event.request.headers.get("accept") && event.request.headers.get("accept").includes("text/html"));

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If valid response, update cache in background
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          // Network failed: try cache first, then fallback to /offline page
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || Response.error();
        })
    );
    return;
  }

  // Rule C: Static Build & Asset Requests -> Cache First / Stale While Revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});
