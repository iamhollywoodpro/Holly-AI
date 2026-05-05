'use client';

import { useEffect } from 'react';

/**
 * Registers HOLLY's service worker for PWA / offline support.
 * - Registers /service-worker.js with scope /
 * - Listens for updates and signals the new worker to skip-waiting
 * - Silently no-ops in unsupported browsers or during SSR
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope:      '/',
          updateViaCache: 'none', // Always check server for new SW — no HTTP cache
        });

        console.log('[SW] Registered, scope:', registration.scope);

        // Check for SW updates on each navigation
        registration.update().catch(() => {});

        // When a new worker is found, tell it to activate immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available — activate on next reload
                console.log('[SW] New version available — will activate on next page load');
                // Signal the new worker to skip waiting so it activates right away
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              } else {
                // First-time install
                console.log('[SW] Content is now available offline');
              }
            }
          });
        });

        // Reload the page when a new SW has taken control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

      } catch (err) {
        // Non-fatal — PWA features degrade gracefully
        console.warn('[SW] Registration failed:', err);
      }
    };

    // Register after page load to avoid blocking initial render
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
