'use client';

import { useState, useEffect } from 'react';
import { Eye, Type, Contrast, Keyboard, Volume2 } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

export function AccessibilitySettings() {
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [keyboardHints, setKeyboardHints] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('holly_accessibility');
    if (saved) {
      const settings = JSON.parse(saved);
      setHighContrast(settings.highContrast || false);
      setFontSize(settings.fontSize || 'medium');
      setReducedMotion(settings.reducedMotion || false);
      setScreenReaderMode(settings.screenReaderMode || false);
      setKeyboardHints(settings.keyboardHints || false);
    }
  }, []);

  useEffect(() => {
    // Apply settings
    const root = document.documentElement;
    
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    root.style.fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'extra-large': '20px',
    }[fontSize] || '16px';

    if (reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
    } else {
      root.style.removeProperty('--animation-duration');
    }

    // Save settings
    localStorage.setItem('holly_accessibility', JSON.stringify({
      highContrast,
      fontSize,
      reducedMotion,
      screenReaderMode,
      keyboardHints,
    }));
  }, [highContrast, fontSize, reducedMotion, screenReaderMode, keyboardHints]);

  return (
    <div className="space-y-6">
      <div>
        <h3 
          className="text-xl font-bold mb-4"
          style={{ color: cyberpunkTheme.colors.text.primary }}
        >
          ♿ Accessibility Settings
        </h3>
        <p style={{ color: cyberpunkTheme.colors.text.secondary }}>
          Customize HOLLY for your needs
        </p>
      </div>

      {/* High Contrast Mode */}
      <div 
        className="p-4 rounded-xl"
        style={{
          backgroundColor: cyberpunkTheme.colors.background.secondary,
          border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Contrast 
              className="w-6 h-6 mt-1"
              style={{ color: cyberpunkTheme.colors.primary.cyan }}
            />
            <div>
              <h4 
                className="font-semibold mb-1"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                High Contrast Mode
              </h4>
              <p 
                className="text-sm"
                style={{ color: cyberpunkTheme.colors.text.tertiary }}
              >
                Increase contrast for better visibility
              </p>
            </div>
          </div>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: highContrast 
                ? cyberpunkTheme.colors.primary.cyan
                : cyberpunkTheme.colors.background.primary,
              color: highContrast ? '#000' : cyberpunkTheme.colors.text.secondary,
            }}
          >
            {highContrast ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Font Size */}
      <div 
        className="p-4 rounded-xl"
        style={{
          backgroundColor: cyberpunkTheme.colors.background.secondary,
          border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <Type 
            className="w-6 h-6 mt-1"
            style={{ color: cyberpunkTheme.colors.primary.cyan }}
          />
          <div>
            <h4 
              className="font-semibold mb-1"
              style={{ color: cyberpunkTheme.colors.text.primary }}
            >
              Font Size
            </h4>
            <p 
              className="text-sm"
              style={{ color: cyberpunkTheme.colors.text.tertiary }}
            >
              Adjust text size for readability
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {['small', 'medium', 'large', 'extra-large'].map(size => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className="flex-1 py-2 rounded-lg transition-colors capitalize"
              style={{
                backgroundColor: fontSize === size
                  ? cyberpunkTheme.colors.primary.cyan
                  : cyberpunkTheme.colors.background.primary,
                color: fontSize === size ? '#000' : cyberpunkTheme.colors.text.secondary,
              }}
            >
              {size.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Reduced Motion */}
      <div 
        className="p-4 rounded-xl"
        style={{
          backgroundColor: cyberpunkTheme.colors.background.secondary,
          border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Eye 
              className="w-6 h-6 mt-1"
              style={{ color: cyberpunkTheme.colors.primary.cyan }}
            />
            <div>
              <h4 
                className="font-semibold mb-1"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                Reduced Motion
              </h4>
              <p 
                className="text-sm"
                style={{ color: cyberpunkTheme.colors.text.tertiary }}
              >
                Minimize animations and transitions
              </p>
            </div>
          </div>
          <button
            onClick={() => setReducedMotion(!reducedMotion)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: reducedMotion 
                ? cyberpunkTheme.colors.primary.cyan
                : cyberpunkTheme.colors.background.primary,
              color: reducedMotion ? '#000' : cyberpunkTheme.colors.text.secondary,
            }}
          >
            {reducedMotion ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Screen Reader Mode */}
      <div 
        className="p-4 rounded-xl"
        style={{
          backgroundColor: cyberpunkTheme.colors.background.secondary,
          border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Volume2 
              className="w-6 h-6 mt-1"
              style={{ color: cyberpunkTheme.colors.primary.cyan }}
            />
            <div>
              <h4 
                className="font-semibold mb-1"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                Screen Reader Optimization
              </h4>
              <p 
                className="text-sm"
                style={{ color: cyberpunkTheme.colors.text.tertiary }}
              >
                Enhanced ARIA labels and descriptions
              </p>
            </div>
          </div>
          <button
            onClick={() => setScreenReaderMode(!screenReaderMode)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: screenReaderMode 
                ? cyberpunkTheme.colors.primary.cyan
                : cyberpunkTheme.colors.background.primary,
              color: screenReaderMode ? '#000' : cyberpunkTheme.colors.text.secondary,
            }}
          >
            {screenReaderMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Keyboard Hints */}
      <div 
        className="p-4 rounded-xl"
        style={{
          backgroundColor: cyberpunkTheme.colors.background.secondary,
          border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Keyboard 
              className="w-6 h-6 mt-1"
              style={{ color: cyberpunkTheme.colors.primary.cyan }}
            />
            <div>
              <h4 
                className="font-semibold mb-1"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                Keyboard Hints
              </h4>
              <p 
                className="text-sm"
                style={{ color: cyberpunkTheme.colors.text.tertiary }}
              >
                Show keyboard shortcuts on focus
              </p>
            </div>
          </div>
          <button
            onClick={() => setKeyboardHints(!keyboardHints)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: keyboardHints 
                ? cyberpunkTheme.colors.primary.cyan
                : cyberpunkTheme.colors.background.primary,
              color: keyboardHints ? '#000' : cyberpunkTheme.colors.text.secondary,
            }}
          >
            {keyboardHints ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}
