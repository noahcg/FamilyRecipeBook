const CACHE_NAME = "home-cooked-static-v3";
const PRECACHE_URLS = ["/manifest.webmanifest", "/offline.html", "/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function shouldCache(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return ["script", "style", "font", "image", "manifest"].includes(request.destination);
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    const fetchPromise = fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => cached ?? Response.error());

    return cached || fetchPromise;
  });
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => caches.match(request).then((cached) => cached ?? Response.error()));
}

function isGroceriesRoute(url) {
  return /^\/app\/books\/[^/]+\/groceries\/?$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.mode === "navigate" &&
    url.origin === self.location.origin &&
    /^\/app\/books\/[^/]+\/offline(?:\/.*)?$/.test(url.pathname)
  ) {
    event.respondWith(
      fetch(request).catch(async () => {
        const fallback = await caches.match("/offline.html");
        return fallback ?? new Response("Offline recipes are unavailable.", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      })
    );
    return;
  }

  // Keep the grocery list usable offline: network-first, but fall back to the
  // last cached copy of the route (full document or RSC navigation payload).
  if (
    url.origin === self.location.origin &&
    isGroceriesRoute(url) &&
    (request.mode === "navigate" || request.headers.get("RSC") === "1")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(request)) ||
            (await caches.match(request, { ignoreSearch: true }));
          if (cached) return cached;
          if (request.mode === "navigate") {
            const shell = await caches.match("/offline.html");
            if (shell) return shell;
          }
          return new Response("Offline.", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        })
    );
    return;
  }

  if (!shouldCache(request)) return;

  event.respondWith(
    request.destination === "script" || request.destination === "style"
      ? networkFirst(request)
      : cacheFirst(request)
  );
});
