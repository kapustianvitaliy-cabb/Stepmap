/* StepMap Service Worker (basic offline support) */
const CACHE_VERSION = "stepmap-v1";
const CACHE_NAME = CACHE_VERSION;

// Кешуємо лише наші файли. Google Maps API/тайли кешувати не будемо.
const ASSETS_TO_CACHE = [
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) => {
            if (k !== CACHE_NAME) return caches.delete(k);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldHandleRequest(request) {
  try {
    const url = new URL(request.url);
    // Обробляємо лише GET і лише наш origin.
    return request.method === "GET" && url.origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!shouldHandleRequest(request)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          return res;
        })
        .catch(() => {
          // Якщо не вдалося — повернемо index.html (для offline навігації).
          if (request.mode === "navigate") return caches.match("./index.html");
          return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        });
    })
  );
});

