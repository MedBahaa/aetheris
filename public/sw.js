// ============================================================
// AETHERIS ADVANCED SERVICE WORKER v4.0 (Zero-Trust Auth Cache)
// Stratégie : Network-only API & routes privées, Cache-first assets publics, Offline fallback
// ============================================================

const CACHE_VERSION = 'v4';
const STATIC_CACHE = `aetheris-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `aetheris-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `aetheris-images-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Uniquement les assets et pages publiques non authentifiées
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/marche-live',
  '/icon-192.png',
  '/icon-512.png',
];

const PRIVATE_PATH_PREFIXES = [
  '/portfolio',
  '/profile',
  '/intelligence',
  '/purification',
  '/auth',
  '/login',
];

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

// ── Installation ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS.map((url) => new Request(url, { cache: 'reload' })));
    }).catch((err) => {
      console.warn('[SW] Précache partiel:', err.message);
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
          .filter(
            (name) =>
              name.startsWith('aetheris-') &&
              ![STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE].includes(name)
          )
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ── Message du client (mise à jour ou purge à la déconnexion) ─
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
  if (event.data?.type === 'CLEAR_AUTH_CACHE') {
    event.waitUntil(caches.delete(DYNAMIC_CACHE));
  }
});

// ── Stratégie de fetch intelligente ─────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.g')) return;

  // 1. Network-only pour les appels API
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

  // 2. Network-only (aucune persistance CacheStorage) pour les pages authentifiées / privées
  if (url.origin === self.location.origin && isPrivatePath(url.pathname)) {
    event.respondWith(
      fetch(request).catch(async () => {
        const offlinePage = await caches.match(OFFLINE_URL);
        return offlinePage || new Response('Hors ligne', { status: 503 });
      })
    );
    return;
  }

  // 3. Cache-first pour les images publiques
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

  // 4. Stale-while-revalidate pour les bundles statiques Next.js (_next/static)
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

  // 5. Network-first + Offline fallback uniquement pour les pages publiques
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && !response.headers.get('cache-control')?.includes('no-store')) {
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offlinePage = await caches.match(OFFLINE_URL);
        return offlinePage || new Response('Hors ligne', { status: 503 });
      })
  );
});

// ── Background Sync ──────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-alerts') {
    console.log('[SW] Background sync: sync-alerts');
  }
});

// ── Push Notifications ───────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === 'string' ? data.title : 'Aetheris Alert';
  const options = {
    body: typeof data.body === 'string' ? data.body : 'Une alerte de cours a été déclenchée.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: typeof data.tag === 'string' ? data.tag : 'aetheris-alert',
    requireInteraction: Boolean(data.requireInteraction),
    data: { url: typeof data.url === 'string' ? data.url : '/portfolio' },
    actions: [
      { action: 'open', title: 'Voir le détail', icon: '/icon-192.png' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click (Validation Same-Origin stricte anti-Open Redirect) ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  let safeTargetUrl = new URL('/portfolio', self.location.origin).href;
  try {
    const rawUrl = event.notification.data?.url || '/portfolio';
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) {
      safeTargetUrl = parsed.href;
    }
  } catch {
    // Conserver le fallback /portfolio same-origin
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === safeTargetUrl && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(safeTargetUrl);
    })
  );
});
