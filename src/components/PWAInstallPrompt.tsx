'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

/**
 * PWA Install Prompt — shows "Add to Home Screen" banner on mobile.
 * Works on Android (Chrome) automatically via beforeinstallprompt event.
 * On iOS Safari shows manual instructions (iOS doesn't support the event).
 * Dismisses permanently once installed or user clicks dismiss.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner]         = useState(false);
  const [isIOS, setIsIOS]                   = useState(false);
  const [isInstalled, setIsInstalled]       = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Already dismissed — don't show again
    if (localStorage.getItem('pwa-install-dismissed') === 'true') return;

    // Detect iOS
    const iosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const safariOnly = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (iosDevice && safariOnly) {
      setIsIOS(true);
      // Show iOS instructions after 3 seconds
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android/Chrome: listen for the native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe animate-slide-up">
      <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-4 shadow-2xl shadow-purple-500/20 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Install HOLLY</p>
            {isIOS ? (
              <p className="text-xs text-gray-400 mt-0.5">
                Tap <span className="text-purple-400 font-medium">Share ↑</span> then{' '}
                <span className="text-purple-400 font-medium">Add to Home Screen</span> for the full app experience.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">
                Add HOLLY to your home screen for instant access — works offline too.
              </p>
            )}

            {/* Install button (Android only) */}
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-gray-800 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
