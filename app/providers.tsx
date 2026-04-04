'use client';

import { useEffect, useCallback } from 'react';
import { useSettings } from '@/lib/settings/settings-store';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

// Pages where we should NOT attempt to load user settings.
// On these pages the user is unauthenticated, so /api/settings would
// redirect to /sign-in and return HTML instead of JSON — causing a
// "SyntaxError: Unexpected token '<'" console error on every page load.
const AUTH_PAGES = new Set(['/sign-in', '/sign-up', '/']);

/**
 * Settings Provider - Loads and applies user settings globally.
 * Only fetches settings when the user is signed in and on an authenticated page.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { settings, loadSettings } = useSettings();
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname();

  // Only load settings when auth is ready AND user is signed in AND not on an auth page
  const shouldLoadSettings = isLoaded && isSignedIn && !AUTH_PAGES.has(pathname ?? '');

  useEffect(() => {
    if (shouldLoadSettings) {
      loadSettings();
    }
  }, [shouldLoadSettings, loadSettings]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.appearance.theme);
    root.setAttribute('data-color-scheme', settings.appearance.colorScheme);
    root.setAttribute('data-font-size', settings.appearance.fontSize);

    if (settings.appearance.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    if (!settings.appearance.animations) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }
  }, [settings.appearance]);

  // Apply debug mode
  useEffect(() => {
    if (settings.developer.debugMode) {
      window.__HOLLY_DEBUG__ = true;
    } else {
      window.__HOLLY_DEBUG__ = false;
    }
  }, [settings.developer.debugMode]);

  return <>{children}</>;
}

// TypeScript declaration for debug flag
declare global {
  interface Window {
    __HOLLY_DEBUG__?: boolean;
  }
}
