/* ECO App — Service Worker
   Strategia: network-first + auto-update immediato
   Cache solo asset statici locali; foto Unsplash e PDF esclusi.
*/

const CACHE_NAME = 'eco-app-v2.37';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/bg.png',
  '/cariverona.png',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// ── INSTALL: precache asset statici ──────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  // Attiva subito senza aspettare che le tab vecchie si chiudano
  self.skipWaiting();
});

// ── ACTIVATE: rimuovi cache vecchie ──────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  // Prendi controllo di tutte le tab aperte immediatamente
  self.clients.claim();
  // Notifica le tab che c'è un aggiornamento → ricaricano in automatico
  self.clients.matchAll({ type: 'window' }).then(clients =>
    clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
  );
});

// ── FETCH: network-first, fallback su cache ───────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Passa direttamente senza cache: Unsplash, Supabase, PDF, Google Fonts
  if (
    url.includes('unsplash.com') ||
    url.includes('supabase.co') ||
    url.includes('.pdf') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Aggiorna la cache con la risposta fresca
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
