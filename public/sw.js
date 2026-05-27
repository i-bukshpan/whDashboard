// Safe, non-intrusive service worker for PWA installability
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Clear any previous PWA caches (like cached dynamic index pages) on activation
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Empty fetch handler is sufficient for PWA installability requirements
  // and prevents any caching/CORS interference with Supabase or Next.js routes.
});
