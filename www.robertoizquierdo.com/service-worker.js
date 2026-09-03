const cacheName = "ri-os-v71";
const core = [
  "./",
  "./index.html",
  "./app.min.css",
  "./app.min.js",
  "./manifest.webmanifest",
  "./assets/images/roberto-izquierdo-avatar.webp",
  "./assets/fonts/source-serif-ui.woff2",
  "./ri-web/",
  "./ri-web/index.html",
  "./ri-web/styles.min.css",
  "./ri-web/i18n.min.js",
  "./ri-web/app.min.js",
  "./assets/icons/globe.svg",
  "./assets/icons/deep-entropy.svg",
  "./assets/icons/ri-code-select.svg",
  "./assets/icons/ri-code-text.svg",
  "./assets/icons/ri-code-image.svg",
  "./assets/icons/ri-code-button.svg",
  "./assets/icons/ri-code-rectangle.svg",
  "./assets/icons/ri-code-ellipse.svg",
  "./assets/icons/ri-code-line.svg",
  "./assets/icons/ri-code-table.svg",
  "./assets/icons/ri-code-textarea.svg",
  "./assets/icons/ri-code-checkbox.svg",
  "./assets/icons/ri-code-radio.svg",
  "./assets/favicons/android-chrome-192x192.png",
  "./assets/favicons/android-chrome-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(core)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && !event.request.headers.has("range")) {
          const copy = response.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => {
        if (response) return response;
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      }))
  );
});
