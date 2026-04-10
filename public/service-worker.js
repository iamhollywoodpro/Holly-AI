/**
 * HOLLY AI — Service Worker v4
 * Full PWA: offline mode, background sync, push notifications,
 * stale-while-revalidate caching for shell + API.
 */

const CACHE_VERSION = 'holly-v4';
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL   = '/offline';

// ─── Shell assets (cache-first forever) ──────────────────────────────────────
const SHELL_ASSETS = [
  '/',
  '/offline',
  '/chat',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
];

// ─── Install: pre-cache shell ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll fails silently for individual misses — use individual adds
      Promise.allSettled(SHELL_ASSETS.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// ─── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(k => k.startsWith('holly-') && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch strategy ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip Clerk auth proxy — must always hit network
  if (url.pathname.startsWith('/api/clerk')) return;

  // Skip streaming APIs — SSE streams cannot be cached
  if (
    url.pathname.startsWith('/api/chat') ||
    url.pathname.startsWith('/api/voice/stream') ||
    url.pathname.startsWith('/api/voice/transcribe')
  ) return;

  // API calls: network-first with offline fallback (5s timeout)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, 5000));
    return;
  }

  // Navigation requests: stale-while-revalidate with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigateFetch(request));
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ─── Strategy helpers ─────────────────────────────────────────────────────────

async function navigateFetch(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Offline: try cache
    const cached = await caches.match(request);
    if (cached) return cached;
    // Final fallback: offline page
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function networkFirstWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timeout);
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || fetchPromise || new Response('Offline', { status: 503 });
}

// ─── Background sync (deferred posts when offline) ────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  // Placeholder — extend for offline-composed messages
  console.log('[SW] Background sync: sync-messages');
}

// ─── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body:    data.body || 'HOLLY has a message for you',
    icon:    '/favicon.png',
    badge:   '/favicon.png',
    vibrate: [100, 50, 100],
    data:    { url: data.url || '/chat' },
    actions: [
      { action: 'open',    title: 'Open HOLLY' },
      { action: 'dismiss', title: 'Dismiss'    },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'HOLLY AI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/chat';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ─── Message handling (skip-waiting on demand) ────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});
