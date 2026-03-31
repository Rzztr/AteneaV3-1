// sw.js - Service Worker para GhostPrism PWA
// Estrategias implementadas: Cache-First, Network-First, Stale-While-Revalidate

const VERSION = 'v0.3.12';
const CACHE_NAME = `Atenea-${VERSION}`;

// Archivos que se cachean al instalar (estáticos esenciales)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/supabase.js',
  '/assets/icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// ─────────────────────────────────────────────
// INSTALL → Cachear archivos estáticos esenciales
// ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando atenea Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando archivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activar inmediatamente sin esperar recarga
  );
});

// ─────────────────────────────────────────────
// ACTIVATE → Limpiar cachés de versiones anteriores
// ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando y limpiando cachés antiguos...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Eliminando caché antigua:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim()) // Tomar control de todas las pestañas abiertas
  );
});

// ─────────────────────────────────────────────
// ESTRATEGIA 1: Cache-First
// Ideal para: CSS, JS propio, fuentes, íconos estáticos
// Devuelve caché si existe; si no, va a red y guarda en caché
// ─────────────────────────────────────────────
function cacheFirst(request) {
  return caches.match(request)
    .then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        // Guardar en caché si la respuesta es válida (incluye cors para CDNs)
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback a página offline si no hay red ni caché
        return caches.match('/offline.html');
      });
    });
}

// ─────────────────────────────────────────────
// ESTRATEGIA 2: Network-First
// Ideal para: index.html, llamadas a API, datos dinámicos
// Intenta red primero; si falla, usa caché
// ─────────────────────────────────────────────
function networkFirst(request) {
  return fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseToCache);
      });
    }
    return networkResponse;
  }).catch(() => {
    // Sin red: buscar en caché o mostrar página offline
    return caches.match(request).then((cachedResponse) => {
      return cachedResponse || caches.match('/offline.html');
    });
  });
}

// ─────────────────────────────────────────────
// ESTRATEGIA 3: Stale-While-Revalidate
// Ideal para: imágenes, recursos de terceros (Leaflet, CDN)
// Devuelve caché inmediatamente Y actualiza en segundo plano
// ─────────────────────────────────────────────
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then((cache) => {
    return cache.match(request).then((cachedResponse) => {
      // Actualizar en segundo plano sin bloquear la respuesta
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => cachedResponse); // Si falla la red, mantener caché

      // Retorna caché al instante si existe, si no espera la red
      return cachedResponse || fetchPromise;
    });
  });
}

// ─────────────────────────────────────────────
// FETCH → Interceptar peticiones y aplicar estrategia según recurso
// ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones no-GET y extensiones del navegador
  if (event.request.method !== 'GET' ||
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  const url = new URL(event.request.url);

  // Recursos de CDN externos (Leaflet, etc.) → Stale-While-Revalidate
  if (url.origin !== location.origin) {
    event.respondWith(staleWhileRevalidate(event.request));

  // Imágenes locales → Stale-While-Revalidate
  } else if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/)) {
    event.respondWith(staleWhileRevalidate(event.request));

  // API Supabase y datos dinámicos → Network-First
  } else if (url.pathname.includes('/api/') ||
             url.pathname === '/index.html' ||
             url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(event.request));

  // CSS, JS y demás estáticos → Cache-First
  } else {
    event.respondWith(cacheFirst(event.request));
  }
});

// ─────────────────────────────────────────────
// PUSH → Recibir y mostrar notificaciones push
// ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Notificación push recibida');

  // Parsear datos del servidor o usar valores por defecto
  const data = event.data ? event.data.json() : {
    title: 'GhostPrism',
    body: 'Nueva alerta de seguridad',
    icon: '/assets/icon.png'
  };

  const options = {
    body: data.body,
    icon: data.icon || '/assets/icon.png',
    badge: '/assets/icon.png',
    vibrate: [200, 100, 200], // Patrón de vibración para móvil
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─────────────────────────────────────────────
// NOTIFICATION CLICK → Abrir app al tocar notificación
// ─────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada');
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la app ya está abierta, enfocarla
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no está abierta, abrir nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});

// ─────────────────────────────────────────────
// MESSAGE → Comunicación desde la app principal
// ─────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('[SW] Actualizando service worker por solicitud del cliente');
    self.skipWaiting();
  }
});