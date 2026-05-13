/**
 * HOLLY UX Utilities — Theme Management & Accessibility
 *
 * Provides theme configuration, color contrast validation,
 * responsive breakpoint helpers, and accessibility utilities.
 */

// ── Theme System ─────────────────────────────────────────────────────────────

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface Theme {
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  borderRadius: number;
  fontFamily: string;
}

export const LIGHT_THEME: Theme = {
  name: 'light',
  mode: 'light',
  colors: {
    primary: '#6C5CE7',
    secondary: '#A29BFE',
    accent: '#FD79A8',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#2D3436',
    textSecondary: '#636E72',
    border: '#DFE6E9',
    error: '#D63031',
    success: '#00B894',
    warning: '#FDCB6E',
  },
  borderRadius: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
};

export const DARK_THEME: Theme = {
  name: 'dark',
  mode: 'dark',
  colors: {
    primary: '#A29BFE',
    secondary: '#6C5CE7',
    accent: '#FD79A8',
    background: '#0A0A0F',
    surface: '#1A1A2E',
    text: '#EAEAEA',
    textSecondary: '#A0A0B0',
    border: '#2D2D44',
    error: '#FF6B6B',
    success: '#00D2A0',
    warning: '#FFEAA7',
  },
  borderRadius: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
};

export const THEMES: Record<string, Theme> = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
};

/**
 * Get a theme by name, falling back to dark theme.
 */
export function getTheme(name: string): Theme {
  return THEMES[name] || DARK_THEME;
}

/**
 * Resolve theme from user preference, system preference, or default.
 */
export function resolveTheme(
  userPreference?: string | null,
  systemPreference?: 'light' | 'dark' | null,
): Theme {
  if (userPreference && THEMES[userPreference]) {
    return THEMES[userPreference];
  }
  if (systemPreference) {
    return THEMES[systemPreference] || DARK_THEME;
  }
  return DARK_THEME;
}

// ── Color Contrast (WCAG) ────────────────────────────────────────────────────

/**
 * Convert hex color to RGB components.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return null;

  const full = clean.length === 3
    ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
    : clean;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/**
 * Calculate relative luminance per WCAG 2.0.
 */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const r = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const g = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const b = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors per WCAG 2.0.
 * Returns a value from 1 (no contrast) to 21 (max contrast).
 */
export function contrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color combination meets WCAG AA standard.
 * AA requires: 4.5:1 for normal text, 3:1 for large text.
 */
export function meetsWcagAA(fg: string, bg: string, largeText = false): boolean {
  const ratio = contrastRatio(fg, bg);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if a color combination meets WCAG AAA standard.
 * AAA requires: 7:1 for normal text, 4.5:1 for large text.
 */
export function meetsWcagAAA(fg: string, bg: string, largeText = false): boolean {
  const ratio = contrastRatio(fg, bg);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}

// ── Responsive Breakpoints ───────────────────────────────────────────────────

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Get media query string for a breakpoint (min-width).
 */
export function mediaQuery(breakpoint: Breakpoint): string {
  return `@media (min-width: ${BREAKPOINTS[breakpoint]}px)`;
}

/**
 * Categorize a viewport width into a breakpoint.
 */
export function categorizeViewport(widthPx: number): Breakpoint {
  if (widthPx >= BREAKPOINTS.wide) return 'wide';
  if (widthPx >= BREAKPOINTS.desktop) return 'desktop';
  if (widthPx >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

// ── Accessibility Helpers ────────────────────────────────────────────────────

/**
 * Generate an accessible label for an icon-only button.
 */
export function iconButtonLabel(action: string, target?: string): string {
  return target ? `${action} ${target}` : action;
}

/**
 * Generate a live region announcement string.
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): {
  message: string;
  'aria-live': string;
  'aria-atomic': boolean;
} {
  return {
    message,
    'aria-live': priority,
    'aria-atomic': true,
  };
}

/**
 * Validate that a focus ring color meets contrast requirements.
 */
export function validateFocusRing(color: string, backgroundColor: string): {
  valid: boolean;
  ratio: number;
  recommendation: string;
} {
  const ratio = contrastRatio(color, backgroundColor);
  const valid = ratio >= 3; // WCAG non-text contrast minimum

  return {
    valid,
    ratio: Math.round(ratio * 100) / 100,
    recommendation: valid
      ? 'Focus ring meets contrast requirements'
      : `Contrast ratio ${ratio.toFixed(2)}:1 is below 3:1 minimum. Use a lighter or darker ring color.`,
  };
}

/**
 * Check if a theme meets accessibility standards.
 */
export function auditThemeAccessibility(theme: Theme): {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; ratio: number }>;
} {
  const checks = [
    {
      name: 'Text on background',
      passed: meetsWcagAA(theme.colors.text, theme.colors.background),
      ratio: contrastRatio(theme.colors.text, theme.colors.background),
    },
    {
      name: 'Secondary text on background',
      passed: meetsWcagAA(theme.colors.textSecondary, theme.colors.background, true),
      ratio: contrastRatio(theme.colors.textSecondary, theme.colors.background),
    },
    {
      name: 'Text on surface',
      passed: meetsWcagAA(theme.colors.text, theme.colors.surface),
      ratio: contrastRatio(theme.colors.text, theme.colors.surface),
    },
    {
      name: 'Primary on background',
      passed: meetsWcagAA(theme.colors.primary, theme.colors.background, true),
      ratio: contrastRatio(theme.colors.primary, theme.colors.background),
    },
    {
      name: 'Error on background',
      passed: meetsWcagAA(theme.colors.error, theme.colors.background, true),
      ratio: contrastRatio(theme.colors.error, theme.colors.background),
    },
  ];

  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}
