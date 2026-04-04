'use client';

import { useEffect, ReactNode } from 'react';
import { useSettings } from '@/lib/settings/settings-store';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

interface ThemeProviderProps {
  children: ReactNode;
}

// Pages where settings should NOT be fetched (user is unauthenticated)
const AUTH_PAGES = new Set(['/sign-in', '/sign-up', '/factor-two', '/']);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings, loadSettings } = useSettings();
  const { isSignedIn, isLoaded } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    // Only load settings when:
    // 1. Clerk auth state is ready (isLoaded)
    // 2. User is signed in
    // 3. Not on a public auth page (which would return HTML instead of JSON)
    //
    // Without this guard, /api/settings returns a redirect to /sign-in
    // which is HTML — causing "SyntaxError: Unexpected token '<'" in the console.
    const shouldLoad = isLoaded && isSignedIn && !AUTH_PAGES.has(pathname ?? '');
    if (shouldLoad) {
      loadSettings();
    }
  }, [isLoaded, isSignedIn, pathname]);

  useEffect(() => {
    if (!settings?.appearance) return;

    const { theme } = settings.appearance;
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    if (theme === 'auto') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Apply selected theme
      root.classList.add(theme);
    }
  }, [settings?.appearance?.theme]);

  useEffect(() => {
    if (!settings?.appearance?.fontSize) return;

    const root = document.documentElement;
    const { fontSize } = settings.appearance;

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };

    root.style.fontSize = fontSizeMap[fontSize] || fontSizeMap.medium;
  }, [settings?.appearance?.fontSize]);

  return <>{children}</>;
}
