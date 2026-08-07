// ============================================================
// AETHERIS ADVANCED SERVICE WORKER v3.0
// Stratégie : Network-first API, Cache-first assets, Offline fallback
// ============================================================

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `aetheris-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `aetheris-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `aetheris-images-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Assets statiques à précacher impérativement
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/intelligence',
  '/portfolio',
  '/marche-live',
  '/profile',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Installation ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Précache des assets statiques...');
      return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch((err) => {
      console.warn('[SW] Précache partiel (certaines pages inaccessibles):', err.message);
    })
  );
  self.skipWaiting();
});

// ── Activation & Nettoyage ──────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) =>
            name.startsWith('aetheris-') &&
            ![STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE].includes(name)
          )
          .map((name) => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ── Message du client (ex: demande de mise à jour) ──────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// ── Stratégie de fetch intelligente ─────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les extensions browser
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.g')) return;

  // 1. STRATEGY: Network-only pour les API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Hors-ligne. Données indisponibles.', offline: true }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // 2. STRATEGY: Cache-first pour les images
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // 3. STRATEGY: Stale-while-revalidate pour les assets Next.js (_next/static)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. STRATEGY: Network-first + Offline fallback pour les pages HTML
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Renvoyer la page offline si aucun cache disponible
        const offlinePage = await caches.match(OFFLINE_URL);
        return offlinePage || new Response('Hors ligne', { status: 503 });
      })
  );
});

// ── Background Sync : rejouer les alertes en attente ────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-alerts') {
    console.log('[SW] Background sync: sync-alerts');
  }
});

// ── Push Notifications ───────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Aetheris Alert';
  const options = {
    body: data.body || 'Une alerte de cours a été déclenchée.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'aetheris-alert',
    requireInteraction: data.requireInteraction || false,
    data: { url: data.url || '/portfolio' },
    actions: data.actions || [
      { action: 'open', title: 'Voir le détail', icon: '/icon-192.png' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ───────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/portfolio';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
