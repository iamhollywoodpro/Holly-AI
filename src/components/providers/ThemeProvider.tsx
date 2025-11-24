'use client';

import { useEffect, ReactNode } from 'react';
import { useSettings } from '@/lib/settings/settings-store';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings, loadSettings } = useSettings();

  useEffect(() => {
    // Load settings on mount
    loadSettings();
  }, []);

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
