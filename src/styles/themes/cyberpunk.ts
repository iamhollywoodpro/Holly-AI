/**
 * HOLLY 2.0 - Unified Holly-Centric Theme
 * Emerald (her eyes) + Copper (her hair) + Gold (highlights) on Warm Dark
 */

export const cyberpunkTheme = {
  colors: {
    // Primary Colors — Holly's Features
    primary: {
      purple: '#C47A4A',      // Burnished Copper (her auburn hair)
      cyan: '#2D8B5E',        // Deep Emerald (her green eyes)
      pink: '#D4A853',        // Holly Gold (highlights)
    },

    // Background (Warm Void)
    background: {
      primary: '#0A0908',     // Warm Void
      secondary: '#0A0908',   // Warm Void
      tertiary: '#141210',    // Surface
      elevated: '#1E1B18',    // Raised
    },

    // Text
    text: {
      primary: '#F5F0E8',     // Warm Ivory
      secondary: '#BFB5A5',   // Cream
      tertiary: '#8C8476',    // Secondary text
      muted: '#5C564D',       // Muted
    },

    // Accent Colors
    accent: {
      success: '#3DAF76',     // Jade
      warning: '#E8A862',     // Amber
      error: '#B84052',       // Deep Rose
      info: '#2D8B5E',        // Emerald
    },

    // Gradients
    gradients: {
      primary: 'linear-gradient(135deg, #2D8B5E 0%, #C47A4A 100%)',
      secondary: 'linear-gradient(135deg, #2D8B5E 0%, #D4A853 100%)',
      holographic: 'linear-gradient(135deg, #2D8B5E 0%, #C47A4A 50%, #D4A853 100%)',
      glow: 'linear-gradient(180deg, rgba(45, 139, 94, 0.2) 0%, rgba(196, 122, 74, 0.2) 100%)',
    },

    // Borders
    border: {
      primary: '#2D8B5E15',   // Subtle emerald border
      accent: '#2D8B5E30',    // Accent emerald border
      glow: '#2D8B5E',        // Glowing border
    },

    // Shadows
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      glow: '0 0 20px rgba(45, 139, 94, 0.4)',
      glowCyan: '0 0 20px rgba(45, 139, 94, 0.3)',
      glowPink: '0 0 20px rgba(196, 122, 74, 0.3)',
    },
  },

  // Animation durations
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },

  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },

  // Border radius
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },

  // Typography
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
};

export type CyberpunkTheme = typeof cyberpunkTheme;
