'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

// Holly emerald/copper color palette
const H = {
  bg: { dark: '#0A0908', surface: '#141210' },
  text: { primary: '#F5F0E8', secondary: '#8C8476', tertiary: '#5C564D' },
  border: '#2A2520',
  gradient: 'linear-gradient(135deg, #66CCCC 0%, #C7B8EA 100%)',
  holographic: 'linear-gradient(135deg, #C7B8EA 0%, #66CCCC 50%, #66CCCC 100%)',
};

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: H.bg.dark }}
    >
      <div className="max-w-md text-center">
        {/* Offline Icon */}
        <div 
          className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: H.bg.surface,
            border: `2px solid ${H.border}`,
          }}
        >
          <WifiOff 
            className="w-12 h-12"
            style={{ color: H.text.tertiary }}
          />
        </div>

        {/* Title */}
        <h1 
          className="text-3xl font-bold mb-3"
          style={{
            background: H.holographic,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          You're Offline
        </h1>

        {/* Description */}
        <p 
          className="text-lg mb-6"
          style={{ color: H.text.secondary }}
        >
          It looks like you've lost your internet connection. HOLLY needs to be online to function.
        </p>

        {/* Cached Content Info */}
        <div 
          className="p-4 rounded-xl mb-6 text-left"
          style={{
            backgroundColor: H.bg.surface,
            border: `1px solid ${H.border}`,
          }}
        >
          <h3 
            className="font-semibold mb-2"
            style={{ color: H.text.primary }}
          >
            What you can do:
          </h3>
          <ul 
            className="space-y-2 text-sm"
            style={{ color: H.text.tertiary }}
          >
            <li>• View cached conversations</li>
            <li>• Read previously loaded content</li>
            <li>• Wait for connection to restore</li>
          </ul>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors hover:opacity-80"
          style={{
            background: H.gradient,
            color: '#FFFFFF',
          }}
        >
          <RefreshCw className="w-5 h-5" />
          Try Again
        </button>

        {/* Tips */}
        <p 
          className="text-sm mt-6"
          style={{ color: H.text.tertiary }}
        >
          Check your internet connection and try refreshing the page.
        </p>
      </div>
    </div>
  );
}
