/* Deja la app disponible sin conexión. Con internet trae siempre la última versión. */
const VERSION = 'mango-21';
const ARCHIVOS = ['./', 'index.html', 'engine.js', 'nube.js', 'ui.js', 'manifest.webmanifest', 'icono-180.png', 'icono-192.png', 'icono-512.png'];
const FIREBASE = 'https://www.gstatic.com/firebasejs/';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* Las librerías de Firebase tienen versión fija: se guardan la primera vez para poder abrir sin internet. */
  if (req.url.startsWith(FIREBASE)) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const guardado = await cache.match(req);
      if (guardado) return guardado;
      const r = await fetch(req);
      if (r && r.ok) cache.put(req, r.clone());
      return r;
    })());
    return;
  }

  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const conTiempo = new Promise(res => setTimeout(() => res(null), 2500));
    const deRed = fetch(req).then(r => {
      if (r && r.ok) cache.put(req, r.clone());
      return r;
    }).catch(() => null);
    const primero = await Promise.race([deRed, conTiempo]);
    if (primero) return primero;
    const guardado = await cache.match(req, { ignoreSearch: true });
    if (guardado) return guardado;
    const tarde = await deRed;
    return tarde || (await cache.match('index.html')) || Response.error();
  })());
});
