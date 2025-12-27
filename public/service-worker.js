/**
 * HOLLY AI - Service Worker
 * Offline mode and caching
 */

const CACHE_NAME = 'holly-ai-v1';
const OFFLINE_URL = '/offline';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/assets/logo-icon-small.png',
  '/assets/logo-icon-large.png',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API requests (they need to be online)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache if not a success response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If both cache and network fail, show offline page
          return caches.match(OFFLINE_URL);
        });
    })
  );
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_CONVERSATION') {
    // Cache a conversation for offline access
    const { conversationId, data } = event.data;
    caches.open(CACHE_NAME).then((cache) => {
      cache.put(
        `/conversations/${conversationId}`,
        new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Clear all caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    });
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-conversations') {
    event.waitUntil(syncConversations());
  }
});

async function syncConversations() {
  // Get pending actions from IndexedDB and sync them
  // This would be implemented with IndexedDB API
  console.log('Syncing conversations...');
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'HOLLY AI';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/assets/logo-icon-large.png',
    badge: '/assets/logo-icon-small.png',
    data: data.url || '/',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
