const CACHE = 'zerok-vault-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/zerok.css',
  '/zerok-vault.js',
  '/manifest.json',
  '/sw.js',
  '/icon-192.png',
  '/icon-512.png'
];

const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  if (e.request.method !== 'GET') return;
  
  if (STATIC_ASSETS.includes(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(r => r) || fetch(e.request).then(response => {
      if (response.ok && response.type === 'basic') {
        const c = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, c));
      }
      return response;
    })
  );
});