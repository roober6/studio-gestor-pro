// Service Worker para Studio Gestor Pro
const CACHE_NAME = 'gestor-pro-v3';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Cacheando archivos');
        return cache.addAll(URLS_TO_CACHE).catch(err => {
          console.log('[ServiceWorker] Cache error:', err);
        });
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Borrando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Cache first, fallback to network
self.addEventListener('fetch', event => {
  // Skip no-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Return offline page or cached response
        return caches.match(event.request)
          .then(response => response || caches.match('/index.html'));
      })
  );
});

// Background sync (cuando vuelve la conexión)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-projects') {
    event.waitUntil(
      fetch('/api/sync').then(response => {
        console.log('[ServiceWorker] Sync completo');
      }).catch(err => {
        console.log('[ServiceWorker] Sync error:', err);
      })
    );
  }
});
