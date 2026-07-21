const CACHE_NAME = 'dockform-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/icon.png',
  '/logo.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // /api/health is deliberately never cached: the offline queue's connectivity probe
  // (isReallyOnline) depends on this request actually reaching the network -- if a prior
  // online fetch got cached here, a later offline fetch would be served the stale cached
  // {status:"ok"} response instead of failing, and the queue would wrongly believe it's
  // online. Let it hit the network directly and fail naturally when offline.
  if (url.pathname === '/api/health') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match('/')))
  );
});
