const VERSION = "v2.3.17-2026";
const CACHE_NAME = `Atenea-Beacon-${VERSION}`;
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/main.js",
  "/js/auth.js",
  "/js/supabase.js",
  "/js/dashboard.js",
  "/js/map.js",
  "/icon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando GhostPrism Service Worker...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Cacheando archivos estáticos");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        self.skipWaiting();
      }),
  );
});
self.addEventListener("activate", (event) => {
  console.log("[SW] Activando y limpiando cachés antiguos...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log("[SW] Eliminando caché antigua:", name);
              return caches.delete(name);
            }),
        ),
      )
      .then(() => {
        self.clients.claim();
      }),
  );
});
function cacheFirst(request) {
  return caches.match(request).then((cachedResponse) => {
    if (cachedResponse) {
      return cachedResponse;
    }
    return fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match("/offline.html"));
  });
}
function networkFirst(request) {
  return fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return networkResponse;
    })
    .catch(() =>
      caches
        .match(request)
        .then(
          (cachedResponse) => cachedResponse || caches.match("/offline.html"),
        ),
    );
}
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      return cachedResponse || fetchPromise;
    }),
  );
}
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    event.request.url.startsWith("chrome-extension://")
  ) {
    return;
  }
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) {
    event.respondWith(staleWhileRevalidate(event.request));
  } else if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/)) {
    event.respondWith(staleWhileRevalidate(event.request));
  } else if (
    url.pathname.includes("/api/") ||
    url.pathname === "/index.html" ||
    url.hostname.includes("supabase.co")
  ) {
    event.respondWith(networkFirst(event.request));
  } else {
    event.respondWith(cacheFirst(event.request));
  }
});
self.addEventListener("push", (event) => {
  console.log("[SW] Notificación push recibida");
  const data = event.data
    ? event.data.json()
    : {
        title: "GhostPrism",
        body: "Nueva alerta de seguridad",
        icon: "/assets/icon.png",
      };
  const options = {
    body: data.body,
    icon: data.icon || "/assets/icon.png",
    badge: "/assets/icon.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notificación clickeada");
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: !0 })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === "/" && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || "/");
        }
      }),
  );
});
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    console.log("[SW] Actualizando service worker por solicitud del cliente");
    self.skipWaiting();
  }
});
