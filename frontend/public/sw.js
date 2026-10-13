// frontend/public/sw.js
/**
 * Service Worker untuk PDF Toolbox Pro PWA.
 * Menggunakan strategi Network-First untuk seluruh bundel JS/CSS/HTML agar pengguna
 * selalu mendapatkan pembaruan kode terbaru secara langsung tanpa terjebak cache lama.
 */

const CACHE_NAME = 'pdf-toolbox-v2.1';

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Abaikan request non-GET dan protokol bukan HTTP/HTTPS
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 2. Abaikan endpoint API & backend server
  if (
    url.pathname.startsWith('/tools/') ||
    url.pathname.startsWith('/convert/') ||
    url.pathname.startsWith('/jobs/') ||
    url.pathname.startsWith('/storage/') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('run.app') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('midtrans.com') ||
    url.hostname.includes('googlesyndication.com') ||
    url.hostname.includes('pagead2.googlesyndication.com')
  ) {
    return;
  }

  // 3. Strategi Network-First untuk semua navigasi HTML dan aset JS/CSS
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
          return Response.error();
        });
      })
  );
});
