/**
 * @fileoverview サービスワーカー配信エンドポイント
 *
 * オフライン時に offline.html を表示する PWA 機能を提供する。
 * v2.8.0 の FastAPI テンプレートから移植。
 */

const SW_SCRIPT = `\
const OFFLINE_VERSION = 1;
const CACHE_NAME = "offline";
const OFFLINE_URL = "static/html/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
    })(),
  );
  globalThis.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if ("navigationPreload" in globalThis.registration) {
        await globalThis.registration.navigationPreload.enable();
      }
    })(),
  );
  globalThis.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }
          return await fetch(event.request);
        } catch (error) {
          console.log("Fetch failed; returning offline page instead.", error);
          const cache = await caches.open(CACHE_NAME);
          return await cache.match(OFFLINE_URL);
        }
      })(),
    );
  }
});
`;

export function GET() {
  return new Response(SW_SCRIPT, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    },
  });
}
