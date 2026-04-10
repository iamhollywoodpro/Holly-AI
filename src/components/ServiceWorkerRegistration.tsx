'use client';

import { useEffect } from 'react';

/**
 * Registers the HOLLY service worker for PWA / offline support.
 * Must be a client component — navigator.serviceWorker is browser-only.
 * Silently no-ops in unsupported browsers or during SSR.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });
        console.log('[SW] Registered, scope:', registration.scope);

        // Check for updates on each page load
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available — will update on next reload');
            }
          });
        });
      } catch (err) {
        // Non-fatal — PWA features won't work but app continues normally
        console.warn('[SW] Registration failed:', err);
      }
    };

    // Register after page load to not block initial render
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null; // renders nothing
}
