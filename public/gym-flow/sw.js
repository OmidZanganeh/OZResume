const CACHE_NAME = 'gym-flow-v4-update';
/** Must match Vite `base` in vite.config.ts */
const BASE = '/gym-flow';

/** Safari refuses to show pages when the service worker serves a cached *redirect* for navigation. */
function mustNotCacheForLaterNavigation(response) {
  return (
    response.redirected ||
    response.type === 'opaqueredirect' ||
    (response.status >= 300 && response.status < 400)
  );
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Do NOT precache `${BASE}/` — hosts often 308 to `/gym-flow/` or `index.html`, and caching that
  // redirect breaks the next launch in Safari ("response … has redirections").
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([`${BASE}/index.html`, `${BASE}/manifest.webmanifest`]),
      ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      let cached = await caches.match(event.request);
      if (cached && mustNotCacheForLaterNavigation(cached)) {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(event.request);
        cached = undefined;
      }
      if (cached) return cached;

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok && !mustNotCacheForLaterNavigation(networkResponse)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match(`${BASE}/index.html`);
          if (fallback && !mustNotCacheForLaterNavigation(fallback)) {
            return fallback;
          }
        }
        return new Response('Offline resource unavailable', { status: 503 });
      }
    })(),
  );
});
