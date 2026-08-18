/* Mix Chat PWA Service Worker - Production Safe & Privacy Preserving */

const CACHE_VERSION = "v6";
const CACHE_NAME = `mixchat-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/favicon.ico",
  "/mixchat-icon.png",
  "/mixchat-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

// Helper to determine if request is a private / dynamic API or websocket or video stream
function isPrivateOrDynamicRequest(url, request) {
  const path = url.pathname;
  return (
    url.protocol === "ws:" ||
    url.protocol === "wss:" ||
    request.headers.has("range") ||
    path.endsWith(".mp4") ||
    path.endsWith(".webm") ||
    path.endsWith(".mp3") ||
    path.endsWith(".m4a") ||
    path.startsWith("/api/") ||
    path.includes("/auth") ||
    path.includes("/login") ||
    path.includes("/register") ||
    path.includes("/_next/webpack-hmr") ||
    path.includes("/socket.io")
  );
}

function isCacheableSameOriginAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    PRECACHE_ASSETS.includes(url.pathname)
  );
}

async function putBounded(cache, request, response, maxEntries = 150) {
  await cache.put(request, response);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(
      keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)),
    );
  }
}

// 1. Install Event - Precache core shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// 2. Activate Event - Clean up stale cache keys
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 3. Fetch Event
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip non-http(s) requests (e.g. chrome-extension)
  if (!url.protocol.startsWith("http")) return;

  // Rule A: NEVER cache API, Auth, Video Range Requests, WebSocket, or HMR (Network Only)
  if (isPrivateOrDynamicRequest(url, event.request)) {
    return;
  }

  // Rule B: Navigation is network-only. Authenticated HTML must never persist
  // in Cache Storage; offline navigation receives the static offline page.
  const isNavigation =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") &&
      event.request.headers.get("accept").includes("text/html"));

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(async () => {
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || Response.error();
        }),
    );
    return;
  }

  // Rule C: Static Build & Asset Requests -> Cache First / Stale While Revalidate
  if (isCacheableSameOriginAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches
                  .open(CACHE_NAME)
                  .then((cache) =>
                    putBounded(cache, event.request, networkResponse),
                  );
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => putBounded(cache, event.request, responseClone));
          }
          return networkResponse;
        });
      }),
    );
    return;
  }
});

// 4. Web Push Event - Wakes Service Worker in background when tab/app is closed
self.addEventListener("push", (event) => {
  let data = {
    title: "MixChat Notification",
    body: "You have new activity on MixChat",
    icon: "/mixchat-icon.png",
    badge: "/icons/icon-192.png",
    url: "/notifications",
    tag: "mixchat-" + Date.now(),
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = {
        title: json.title || data.title,
        body: json.body || data.body,
        icon: json.icon || data.icon,
        badge: json.badge || data.badge,
        url: json.url || (json.data && json.data.url) || data.url,
        tag: json.tag || data.tag,
        notificationId: json.notificationId,
        metadata: json.data || json.metadata,
      };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    renotify: true,
    data: {
      url: data.url,
      notificationId: data.notificationId,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).catch(() => {
      return self.registration.showNotification(data.title, {
        body: data.body,
      });
    }),
  );
});

// 5. Notification Click Event - Focus existing window or open new window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/notifications";
  // Enforce safe internal URL (no javascript: or cross-origin protocol injections)
  const targetUrl =
    rawUrl.startsWith("/") && !rawUrl.startsWith("//")
      ? rawUrl
      : "/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Find already open window matching origin
        for (const client of clientList) {
          if ("focus" in client) {
            if ("navigate" in client && targetUrl) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // If no window is currently open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
