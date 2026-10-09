/* Offline-Betrieb. Warum „Netz zuerst“ statt „Zwischenspeicher zuerst“: eine neue Fassung soll beim
   nächsten Öffnen sofort da sein (sonst sieht man Änderungen erst einen Start später); nur wenn das Netz
   fehlt oder hängt, kommt die zuletzt gespeicherte Fassung. Die Buchungsdaten selbst liegen ohnehin im
   Browser (localStorage) und brauchen kein Netz. */
const CACHE = 'sauna-kasse-v1';
const DATEIEN = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Schlechtes WLAN hängt oft, statt sofort zu scheitern: nach 4 s gilt es als offline.
      const antwort = await Promise.race([fetch(r), new Promise((_, no) => setTimeout(no, 4000))]);
      if (antwort && antwort.ok) cache.put(r, antwort.clone());
      return antwort;
    } catch (x) {
      return (await cache.match(r, { ignoreSearch: true })) || (r.mode === 'navigate' ? await cache.match('index.html') : Response.error());
    }
  })());
});
