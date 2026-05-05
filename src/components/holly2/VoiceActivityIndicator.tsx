'use client';

import { useEffect, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface VoiceActivityIndicatorProps {
  isActive: boolean;
  isEnabled: boolean;
  wakeWordEnabled: boolean;
}

export function VoiceActivityIndicator({ 
  isActive, 
  isEnabled,
  wakeWordEnabled 
}: VoiceActivityIndicatorProps) {
  const [pulseIntensity, setPulseIntensity] = useState(0);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setPulseIntensity(Math.random());
      }, 100);
      return () => clearInterval(interval);
    } else {
      setPulseIntensity(0);
    }
  }, [isActive]);

  if (!isEnabled) return null;

  return (
    <div 
      className="fixed bottom-24 right-6 z-40"
      style={{
        pointerEvents: 'none',
      }}
    >
      <div className="relative">
        {/* Pulse rings */}
        {isActive && (
          <>
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{
                backgroundColor: cyberpunkTheme.colors.primary.cyan,
                opacity: pulseIntensity * 0.3,
                transform: `scale(${1 + pulseIntensity})`,
              }}
            />
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                backgroundColor: cyberpunkTheme.colors.primary.purple,
                opacity: pulseIntensity * 0.2,
                transform: `scale(${1 + pulseIntensity * 0.5})`,
              }}
            />
          </>
        )}

        {/* Main indicator */}
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: isActive 
              ? cyberpunkTheme.colors.primary.cyan
              : cyberpunkTheme.colors.background.secondary,
            border: `2px solid ${isActive 
              ? cyberpunkTheme.colors.primary.cyan
              : cyberpunkTheme.colors.border.primary}`,
            boxShadow: isActive 
              ? `0 0 30px ${cyberpunkTheme.colors.primary.cyan}80`
              : 'none',
          }}
        >
          {isActive ? (
            <Mic className="w-8 h-8 text-white" />
          ) : (
            <MicOff 
              className="w-8 h-8"
              style={{ color: cyberpunkTheme.colors.text.tertiary }}
            />
          )}
        </div>

        {/* Wake word status */}
        {wakeWordEnabled && (
          <div
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs px-3 py-1 rounded-full"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
              color: cyberpunkTheme.colors.text.tertiary,
            }}
          >
            Say "Hey HOLLY"
          </div>
        )}
      </div>
    </div>
  );
}
