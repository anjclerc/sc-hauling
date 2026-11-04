// Service worker de SC Hauling : rend l'appli installable et utilisable hors ligne.
// - la page et les données (data/*.json) : réseau d'abord (toujours la dernière version), copie de secours hors ligne ;
// - icônes et manifeste : copie locale d'abord ;
// - les autres sites (API UEX…) ne passent pas par ici : l'appli gère déjà leur cache.
const CACHE = 'sch-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const key = url.origin + url.pathname;   // sans ?t=… : une seule copie par fichier
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage || url.pathname.includes('/data/')) {
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(isPage && req.mode === 'navigate' ? url.origin + url.pathname.replace(/index\.html$/, '') : key, copy)); }
      return r;
    }).catch(() => caches.match(isPage && req.mode === 'navigate' ? url.origin + url.pathname.replace(/index\.html$/, '') : key, { ignoreSearch: true })
      .then(r => r || caches.match('./', { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.match(key, { ignoreSearch: true }).then(r => r || fetch(req)));
});
