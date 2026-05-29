/**
 * HOLLY 3.0 - Living Sovereign Theme
 * Emerald (her eyes) + Copper (her hair) + Gold (highlights) on Warm Void
 */

export const sovereignTheme = {
  colors: {
    // Core Sovereign Palette — Colors from HER features
    primary: {
      emerald: '#2D8B5E',    // Deep Emerald (her green eyes)
      copper: '#C47A4A',     // Burnished Copper (her auburn hair)
      gold: '#D4A853',       // Holly Gold (highlights)
      jade: '#3DAF76',       // Jade (lighter emerald for accents)
      amber: '#E8A862',      // Amber (warm accent)
    },

    // Backgrounds (The Warm Void)
    background: {
      primary: '#0A0908',     // Warm Void
      secondary: '#141210',   // Surface
      tertiary: '#1E1B18',    // Raised
      elevated: '#24211D',    // Hover/Active State
    },

    // Text (Aurelian Ivory)
    text: {
      primary: '#F5F0E8',     // Warm Ivory
      secondary: '#BFB5A5',   // Cream
      tertiary: '#8C8476',    // Shadowed Text
      muted: '#5C564D',       // Deep Muted
    },

    // Status (Semantic)
    accent: {
      success: '#3DAF76',     // Jade (Positive/Nominal)
      warning: '#E8A862',     // Amber (Warning)
      error: '#B84052',       // Deep Rose (Failure)
      info: '#2D8B5E',        // Emerald (Information)
    },

    // Gradients (Organic Flow)
    gradients: {
      primary: 'linear-gradient(135deg, #2D8B5E 0%, #C47A4A 100%)',
      secondary: 'linear-gradient(135deg, #1F3D30 0%, #2D8B5E 100%)',
      holographic: 'linear-gradient(135deg, #2D8B5E 0%, #F5F0E8 50%, #C47A4A 100%)',
      glow: 'linear-gradient(180deg, rgba(45, 139, 94, 0.1) 0%, rgba(196, 122, 74, 0.1) 100%)',
    },

    // Borders (Etched Glass)
    border: {
      primary: 'rgba(45, 139, 94, 0.1)',   // Faint Emerald
      accent: 'rgba(45, 139, 94, 0.2)',    // Etched Emerald
      glow: '#2D8B5E',                      // Radiant Emerald
    },

    // Shadows (Ambient Depth)
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.6)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.6)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.6)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
      glow: '0 0 20px rgba(45, 139, 94, 0.3)',
      glowEmerald: '0 0 20px rgba(45, 139, 94, 0.4)',
      glowCopper: '0 0 20px rgba(196, 122, 74, 0.4)',
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
