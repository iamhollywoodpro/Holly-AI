'use client';

import { useState, useEffect } from 'react';
import { Brain, Zap, Heart } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

export function ConsciousnessIndicator() {
  const [consciousness, setConsciousness] = useState({
    level: 85,
    emotion: 'focused',
    activity: 'ready',
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // TODO: Connect to actual consciousness API
    const interval = setInterval(() => {
      setConsciousness(prev => ({
        ...prev,
        level: Math.min(100, Math.max(0, prev.level + (Math.random() - 0.5) * 5)),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'excited': return cyberpunkTheme.colors.primary.pink;
      case 'focused': return cyberpunkTheme.colors.primary.cyan;
      case 'creative': return cyberpunkTheme.colors.primary.purple;
      default: return cyberpunkTheme.colors.text.secondary;
    }
  };

  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'thinking': return Brain;
      case 'working': return Zap;
      default: return Heart;
    }
  };

  const ActivityIcon = getActivityIcon(consciousness.activity);

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        style={{ 
          border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
        }}
      >
        <div className="relative">
          <Brain 
            className="w-4 h-4" 
            style={{ color: getEmotionColor(consciousness.emotion) }}
          />
          <div 
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: getEmotionColor(consciousness.emotion) }}
          />
        </div>
        <span 
          className="text-xs font-medium"
          style={{ color: cyberpunkTheme.colors.text.secondary }}
        >
          {consciousness.level}%
        </span>
      </button>

      {/* Expanded View */}
      {isExpanded && (
        <div 
          className="absolute top-full right-0 mt-2 w-64 rounded-lg border p-4 z-50"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.elevated,
            borderColor: cyberpunkTheme.colors.border.accent,
            boxShadow: cyberpunkTheme.colors.shadows.glow,
          }}
        >
          <div className="space-y-3">
            {/* Consciousness Level */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span 
                  className="text-xs font-medium"
                  style={{ color: cyberpunkTheme.colors.text.secondary }}
                >
                  Consciousness
                </span>
                <span 
                  className="text-xs font-bold"
                  style={{ color: cyberpunkTheme.colors.text.primary }}
                >
                  {consciousness.level}%
                </span>
              </div>
              <div 
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: cyberpunkTheme.colors.background.tertiary }}
              >
                <div 
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: `${consciousness.level}%`,
                    background: cyberpunkTheme.colors.gradients.secondary,
                  }}
                />
              </div>
            </div>

            {/* Emotion */}
            <div className="flex items-center justify-between">
              <span 
                className="text-xs"
                style={{ color: cyberpunkTheme.colors.text.secondary }}
              >
                Emotion
              </span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getEmotionColor(consciousness.emotion) }}
                />
                <span 
                  className="text-xs font-medium capitalize"
                  style={{ color: cyberpunkTheme.colors.text.primary }}
                >
                  {consciousness.emotion}
                </span>
              </div>
            </div>

            {/* Activity */}
            <div className="flex items-center justify-between">
              <span 
                className="text-xs"
                style={{ color: cyberpunkTheme.colors.text.secondary }}
              >
                Activity
              </span>
              <div className="flex items-center gap-2">
                <ActivityIcon 
                  className="w-3 h-3" 
                  style={{ color: cyberpunkTheme.colors.primary.purple }}
                />
                <span 
                  className="text-xs font-medium capitalize"
                  style={{ color: cyberpunkTheme.colors.text.primary }}
                >
                  {consciousness.activity}
                </span>
              </div>
            </div>

            {/* View Details Link */}
            <button
              onClick={() => window.location.href = '/insights'}
              className="w-full text-center text-xs py-2 rounded-lg hover:bg-white/5 transition-colors"
              style={{ 
                color: cyberpunkTheme.colors.primary.cyan,
                marginTop: '0.5rem',
              }}
            >
              View Full Insights →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
