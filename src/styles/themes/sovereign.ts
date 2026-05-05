/**
 * HOLLY 3.0 - Living Sovereign Theme
 * Sovereign Gold + Living Crimson + Warm Void
 */

export const sovereignTheme = {
  colors: {
    // Core Sovereign Palette (Aurelian Breath)
    primary: {
      gold: '#D4A853',        // Sovereign Gold
      crimson: '#B84052',     // Living Crimson
      emerald: '#1F3D30',     // Deep Sovereign Green
      cyan: '#5BB8C9',        // Cool Cyan accent (AURA/analysis highlights)
      pink: '#C96B8B',        // Warm Rose accent (creative/highlights)
    },

    // Backgrounds (The Warm Void)
    background: {
      primary: '#0B0A08',     // Deep Void
      secondary: '#12110F',   // Soft Obsidian
      tertiary: '#1A1815',    // Warm Slate
      elevated: '#24211D',    // Hover/Active State
    },

    // Text (Aurelian Ivory)
    text: {
      primary: '#F5F0E8',     // Warm Ivory
      secondary: '#D1C8B8',   // Aged Parchment
      tertiary: '#8C8476',    // Shadowed Text
      muted: '#5C564D',       // Deep Muted
    },

    // Status (Editorial Tone)
    accent: {
      success: '#D4A853',     // Gold (Positive/Nominal)
      warning: '#B84052',     // Crimson (Warning/Critical)
      error: '#B84052',       // Crimson (Failure)
      info: '#D4A853',        // Gold (Information)
    },

    // Gradients (Organic Flow)
    gradients: {
      primary: 'linear-gradient(135deg, #D4A853 0%, #B84052 100%)',
      secondary: 'linear-gradient(135deg, #1F3D30 0%, #D4A853 100%)',
      holographic: 'linear-gradient(135deg, #D4A853 0%, #F5F0E8 50%, #B84052 100%)',
      glow: 'linear-gradient(180deg, rgba(212, 168, 83, 0.1) 0%, rgba(184, 64, 82, 0.1) 100%)',
    },

    // Borders (Etched Glass)
    border: {
      primary: 'rgba(212, 168, 83, 0.1)',   // Faint Gold
      accent: 'rgba(212, 168, 83, 0.2)',    // Etched Gold
      glow: '#D4A853',                      // Radiant Gold
    },

    // Shadows (Ambient Depth)
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.6)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.6)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.6)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
      glow: '0 0 20px rgba(212, 168, 83, 0.3)',
      glowGold: '0 0 20px rgba(212, 168, 83, 0.4)',
      glowCrimson: '0 0 20px rgba(184, 64, 82, 0.4)',
    },
  },

  // Animation durations (Slow & Intentional)
  animation: {
    fast: '200ms',
    normal: '400ms',
    slow: '800ms',
  },

  // Spacing (Editorial White Space)
  spacing: {
    xs: '0.375rem',
    sm: '0.625rem',
    md: '1.25rem',
    lg: '1.875rem',
    xl: '2.5rem',
    '2xl': '3.75rem',
  },

  // Border radius (Soft & Organic)
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },

  // Typography (Aurelian Precision)
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      serif: 'Lora, Georgia, serif',
      mono: 'JetBrains Mono, Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
      '4xl': '2.5rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 900,
    },
  },
};

export type SovereignTheme = typeof sovereignTheme;
