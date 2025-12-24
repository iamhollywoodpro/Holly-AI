/**
 * HOLLY 2.0 - Cyberpunk AI Theme
 * Electric Purple + Cyan + Hot Pink on Deep Dark
 */

export const cyberpunkTheme = {
  colors: {
    // Primary Colors
    primary: {
      purple: '#8B5CF6',      // Electric Purple
      cyan: '#06B6D4',        // Cyan
      pink: '#EC4899',        // Hot Pink
    },
    
    // Background
    background: {
      primary: '#0A0A0F',     // Deep Dark
      secondary: '#13131A',   // Slightly lighter
      tertiary: '#1A1A24',    // Card background
      elevated: '#21212E',    // Elevated elements
    },
    
    // Text
    text: {
      primary: '#FFFFFF',     // White
      secondary: '#A1A1AA',   // Gray
      tertiary: '#71717A',    // Darker gray
      muted: '#52525B',       // Muted
    },
    
    // Accent Colors
    accent: {
      success: '#10B981',     // Green
      warning: '#F59E0B',     // Orange
      error: '#EF4444',       // Red
      info: '#3B82F6',        // Blue
    },
    
    // Gradients
    gradients: {
      primary: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      secondary: 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)',
      holographic: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 50%, #EC4899 100%)',
      glow: 'linear-gradient(180deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
    },
    
    // Borders
    border: {
      primary: '#27272A',     // Subtle border
      accent: '#3F3F46',      // Accent border
      glow: '#8B5CF6',        // Glowing border
    },
    
    // Shadows
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      glow: '0 0 20px rgba(139, 92, 246, 0.5)',
      glowCyan: '0 0 20px rgba(6, 182, 212, 0.5)',
      glowPink: '0 0 20px rgba(236, 72, 153, 0.5)',
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
