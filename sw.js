/* Offline cache so the app works at a booth with no signal.
   App files (html/js/css) are network-first so updates show up on the next load;
   knife photos are cache-first since they never change. Bump VERSION on release. */
const VERSION = 'mm-v20';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const IMAGES = ['images/landscape/pocket-knife.jpg'].concat(['spatula-spreader', 'santoku', 'veggie-6in', 'santoku-trimmer']
  .flatMap(p => ['classic', 'pearl', 'red'].map(h => `images/landscape/${p}-${h}.jpg`)));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll([...SHELL, ...IMAGES])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isImage = /\/(images|icons)\//.test(url.pathname);
  const put = res => { if (res && res.ok) caches.open(VERSION).then(c => c.put(e.request, res.clone())); return res; };
  if (isImage) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(put)));
  } else {
    e.respondWith(fetch(e.request).then(put).catch(() => caches.match(e.request, { ignoreSearch: true })));
  }
});
