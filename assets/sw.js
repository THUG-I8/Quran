// Quran Pro — Service Worker (cache shell for offline UI)
const VERSION = "quran-pro-v1";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/styles.css",
  "./assets/app.js",
  "./assets/api.js",
  "./assets/storage.js",
  "./assets/ui.js",
  "./assets/player.js",
  "./assets/tasbeeh.js",
  "./assets/routes.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === VERSION) ? null : caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests as cache-first (app shell)
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      // cache static GET files
      if (req.method === "GET" && fresh.ok && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || url.pathname.endsWith(".html") || url.pathname.endsWith(".json"))) {
        cache.put(req, fresh.clone()).catch(()=>{});
      }
      return fresh;
    })());
    return;
  }

  // For API requests: network-first with fallback
  if (url.host.includes("api.alquran.cloud")) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try{
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone()).catch(()=>{});
        return fresh;
      }catch{
        const cached = await cache.match(req);
        if (cached) return cached;
        throw;
      }
    })());
  }
});
