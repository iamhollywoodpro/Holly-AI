/**
 * HOLLY AI — Service Worker v4
 * Full PWA: offline mode, background sync, push notifications,
 * stale-while-revalidate caching for shell + API.
 */

const CACHE_VERSION = 'holly-v5';
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

  // Bypass service worker caching entirely for localhost/development
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    return;
  }

  // Skip Clerk auth proxy — must always hit network
  if (url.pathname.startsWith('/api/clerk')) return;

  // Skip streaming APIs — SSE streams cannot be cached
  if (
    url.pathname.startsWith('/api/chat') ||
    url.pathname.startsWith('/api/voice/stream') ||
    url.pathname.startsWith('/api/voice/transcribe')
  ) return;

  // API calls: network-only for non-GET (POST/PUT/DELETE cannot be cached)
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET') {
      event.respondWith(fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline', offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      ));
      return;
    }
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
  if (event.tag === 'sync-cursor') {
    event.waitUntil(syncCursorPositions());
  }
});

// ─── IndexedDB Offline Message Queue ──────────────────────────────────────────

const IDB_NAME = 'holly-offline';
const IDB_VERSION = 1;
const MSG_STORE = 'pending-messages';
const CURSOR_STORE = 'cursor-positions';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(MSG_STORE)) {
        const store = db.createObjectStore(MSG_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('conversationId', 'conversationId', { unique: false });
      }
      if (!db.objectStoreNames.contains(CURSOR_STORE)) {
        db.createObjectStore(CURSOR_STORE, { keyPath: 'conversationId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Queue a message for later delivery when offline.
 * Called from the client via postMessage.
 */
async function queueOfflineMessage(message) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(MSG_STORE, 'readwrite');
    tx.objectStore(MSG_STORE).add({
      ...message,
      timestamp: Date.now(),
      status: 'pending',
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    db.close();
    console.log('[SW] Queued offline message:', message.conversationId);
    // Notify clients about pending message count
    broadcastToClients({ type: 'OFFLINE_QUEUE_UPDATE', pending: await getPendingCount() });
  } catch (err) {
    console.error('[SW] Failed to queue offline message:', err);
  }
}

/**
 * Save cursor/scroll position for a conversation.
 */
async function saveCursorPosition(data) {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(CURSOR_STORE, 'readwrite');
    tx.objectStore(CURSOR_STORE).put({
      conversationId: data.conversationId,
      scrollTop: data.scrollTop,
      inputDraft: data.inputDraft,
      timestamp: Date.now(),
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    db.close();
  } catch (err) {
    console.error('[SW] Failed to save cursor position:', err);
  }
}

/**
 * Count pending messages in the queue.
 */
async function getPendingCount() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(MSG_STORE, 'readonly');
    const count = await new Promise((resolve) => {
      const req = tx.objectStore(MSG_STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
    db.close();
    return count;
  } catch {
    return 0;
  }
}

/**
 * Flush all pending messages to the server.
 * Called by background sync when connectivity restores.
 */
async function syncPendingMessages() {
  let db;
  try {
    db = await openOfflineDB();
    const tx = db.transaction(MSG_STORE, 'readonly');
    const store = tx.objectStore(MSG_STORE);
    const messages = await new Promise((resolve, reject) => {
      const req = store.index('timestamp').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!messages || messages.length === 0) {
      console.log('[SW] No pending messages to sync.');
      db.close();
      return;
    }

    console.log(`[SW] Syncing ${messages.length} offline message(s)...`);
    let synced = 0;
    let failed = 0;

    for (const msg of messages) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg.content,
            conversationId: msg.conversationId,
            model: msg.model || 'default',
            offlineQueued: true,
            originalTimestamp: msg.timestamp,
          }),
        });

        if (response.ok) {
          // Remove from queue
          const deleteTx = db.transaction(MSG_STORE, 'readwrite');
          deleteTx.objectStore(MSG_STORE).delete(msg.id);
          await new Promise((resolve) => { deleteTx.oncomplete = resolve; });
          synced++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`[SW] Failed to sync message ${msg.id}:`, err);
        failed++;
      }
    }

    console.log(`[SW] Sync complete: ${synced} sent, ${failed} failed.`);
    broadcastToClients({
      type: 'OFFLINE_SYNC_COMPLETE',
      synced,
      failed,
      remaining: await getPendingCount(),
    });
  } catch (err) {
    console.error('[SW] syncPendingMessages error:', err);
  } finally {
    if (db) db.close();
  }
}

/**
 * Sync cursor positions — restore scroll + draft on reconnect.
 */
async function syncCursorPositions() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(CURSOR_STORE, 'readonly');
    const positions = await new Promise((resolve) => {
      const req = tx.objectStore(CURSOR_STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });
    db.close();

    if (positions && positions.length > 0) {
      broadcastToClients({
        type: 'CURSOR_RESTORE',
        positions,
      });
    }
  } catch (err) {
    console.error('[SW] syncCursorPositions error:', err);
  }
}

/**
 * Broadcast a message to all connected client windows.
 */
async function broadcastToClients(message) {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage(message);
  }
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

// ─── Message handling (skip-waiting + offline queue commands) ──────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
  // Offline message queuing from client
  if (event.data?.type === 'QUEUE_OFFLINE_MESSAGE') {
    queueOfflineMessage(event.data.payload);
  }
  // Cursor position saving from client
  if (event.data?.type === 'SAVE_CURSOR_POSITION') {
    saveCursorPosition(event.data.payload);
  }
  // Request pending count
  if (event.data?.type === 'GET_PENDING_COUNT') {
    getPendingCount().then(count => {
      event.ports[0]?.postMessage({ type: 'PENDING_COUNT', count });
    });
  }
});

