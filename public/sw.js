// Service Worker for CamargoTech PWA
// Pages: network-first (always fresh, cache only as offline fallback).
// Static assets: cache-first. Only same-origin GET requests are handled.
// Private/dynamic routes (logged-in area, admin, auth API) are NEVER cached.
const CACHE_NAME = 'camargotech-cache-v3';
const PRIVATE_PREFIXES = ['/area-cliente', '/admin', '/api/'];
const ASSETS_TO_CACHE = [
  '/',
  '/servicos',
  '/sobre',
  '/contato',
  '/favicon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

function isCacheable(response) {
  return response && response.ok && response.type === 'basic';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept third-party requests (fonts, maps, WhatsApp, etc.).
  if (url.origin !== self.location.origin) return;
  // Personal data must always come straight from the network.
  if (PRIVATE_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (isCacheable(response) && url.pathname.startsWith('/_astro/')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
