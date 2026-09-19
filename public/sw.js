const CACHE = 'anstay-guide-v1';
const GUIDE = ['/huong-dan.html','/guide.css','/pwa.js','/icons/icon-192.png','/icons/icon-512.png','/icons/apple-touch-icon.png','/icons/maskable-512.png','/offline.html'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(GUIDE))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('anstay-guide-') && k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
 // Never cache operational records, APIs, authentication, app runtime or token URLs.
 if (GUIDE.includes(url.pathname) && !url.search) {
  event.respondWith(fetch(event.request).then(response => { if (response.ok) event.waitUntil(caches.open(CACHE).then(c => c.put(event.request, response.clone()))); return response; }).catch(() => caches.match(event.request)));
 } else if (event.request.mode === 'navigate') {
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
 }
});
