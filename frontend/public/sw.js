// frontend/public/sw.js
/**
 * Service Worker untuk PDF Toolbox Pro PWA.
 * Mendukung offline caching untuk Shell Aplikasi & In-Memory Client Tools (Merge/Split/Organize).
 */

const CACHE_NAME = 'pdf-toolbox-v1.0';

// Aset statis inti yang langsung dicache saat Service Worker dipasang
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Abaikan request non-GET dan protokol bukan HTTP/HTTPS
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 2. Abaikan endpoint API & backend server (selalu Network-First / Network-Only)
  if (
    url.pathname.startsWith('/tools/') ||
    url.pathname.startsWith('/convert/') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('midtrans.com') ||
    url.hostname.includes('googlesyndication.com') ||
    url.hostname.includes('pagead2.googlesyndication.com')
  ) {
    return;
  }

  // 3. Strategi untuk Navigasi Halaman HTML: Network-First dengan Fallback ke Cache index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 4. Strategi untuk Aset Statis (JS chunks, CSS, Icons, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika offline dan tidak ada di cache, biarkan cachedResponse yang menangani
        });

      return cachedResponse || fetchPromise;
    })
  );
});
