// Service Worker — EUR/USD ICT Dashboard
const CACHE = 'eurusd-ict-v4';
const APP_SHELL = [
  './',
  './index.html',
  './tuto-debutant.html',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Ne jamais cacher les data live API
  if(url.hostname.includes('twelvedata.com')) return;
  // Méthodes autres que GET : passe directement
  if(e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(resp => {
        // Cache les CDN (Lightweight Charts, Chart.js) au passage
        if(resp.ok && (url.hostname.includes('unpkg.com') || url.hostname.includes('jsdelivr.net'))){
          const cloned = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, cloned));
        }
        return resp;
      }).catch(() => {
        // Fallback offline : retourne index.html pour les navigations HTML
        if(e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
