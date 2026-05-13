const VERSION = "v2.3.20-2026-forced";
const CACHE_NAME = `Atenea-Beacon-${VERSION}`;
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/main.js",
  "/js/supabase.js",
  "/js/db.js",
  "/icon.png",
  "/offline.html",
];
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.includes("supabase.co") || url.pathname.endsWith(".js") || url.pathname === "/index.html") {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(res => res || fetch(event.request))
    );
  }
});
