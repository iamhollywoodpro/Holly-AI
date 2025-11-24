'use client';

import { useEffect } from 'react';
import { useSettings } from '@/lib/settings/settings-store';

/**
 * Settings Provider - Loads and applies user settings globally
 * This component initializes settings and applies theme changes
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { settings, loadSettings } = useSettings();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme
    root.setAttribute('data-theme', settings.appearance.theme);
    
    // Apply color scheme
    root.setAttribute('data-color-scheme', settings.appearance.colorScheme);
    
    // Apply font size
    root.setAttribute('data-font-size', settings.appearance.fontSize);
    
    // Apply compact mode
    if (settings.appearance.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
    
    // Apply animations
    if (!settings.appearance.animations) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }
  }, [settings.appearance]);

  // Apply debug mode
  useEffect(() => {
    if (settings.developer.debugMode) {
      console.log('[HOLLY Debug] Debug mode enabled');
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
