/// <reference types="jest" />

/**
 * Phase 7 — UX Perfection Test Suite
 *
 * Tests theme management, WCAG color contrast validation,
 * responsive breakpoints, and accessibility helpers.
 */

import {
  LIGHT_THEME,
  DARK_THEME,
  THEMES,
  getTheme,
  resolveTheme,
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  BREAKPOINTS,
  mediaQuery,
  categorizeViewport,
  iconButtonLabel,
  announceToScreenReader,
  validateFocusRing,
  auditThemeAccessibility,
} from '@/lib/ux/theme-accessibility';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: Theme Management
// ═══════════════════════════════════════════════════════════════════════════════

describe('Theme Management', () => {
  it('should have light and dark themes', () => {
    expect(THEMES.light).toBeDefined();
    expect(THEMES.dark).toBeDefined();
  });

  it('should return dark theme by default', () => {
    expect(getTheme('nonexistent').mode).toBe('dark');
  });

  it('should return correct theme by name', () => {
    expect(getTheme('light').mode).toBe('light');
    expect(getTheme('dark').mode).toBe('dark');
  });

  it('should resolve user preference first', () => {
    expect(resolveTheme('light').mode).toBe('light');
    expect(resolveTheme('dark').mode).toBe('dark');
  });

  it('should fall back to system preference', () => {
    expect(resolveTheme(null, 'light').mode).toBe('light');
    expect(resolveTheme(null, 'dark').mode).toBe('dark');
  });

  it('should default to dark when no preferences', () => {
    expect(resolveTheme(null, null).mode).toBe('dark');
  });

  it('should ignore invalid user preferences', () => {
    expect(resolveTheme('neon', 'light').mode).toBe('light');
  });

  describe('Theme Structure', () => {
    it('light theme should have all required color fields', () => {
      const colors = LIGHT_THEME.colors;
      expect(colors).toHaveProperty('primary');
      expect(colors).toHaveProperty('secondary');
      expect(colors).toHaveProperty('accent');
      expect(colors).toHaveProperty('background');
      expect(colors).toHaveProperty('surface');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('textSecondary');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('error');
      expect(colors).toHaveProperty('success');
      expect(colors).toHaveProperty('warning');
    });

    it('dark theme should have all required color fields', () => {
      const colors = DARK_THEME.colors;
      const requiredFields = ['primary', 'secondary', 'accent', 'background',
        'surface', 'text', 'textSecondary', 'border', 'error', 'success', 'warning'];
      for (const field of requiredFields) {
        expect(colors).toHaveProperty(field);
      }
    });

    it('themes should have valid hex colors', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const theme of [LIGHT_THEME, DARK_THEME]) {
        for (const [, value] of Object.entries(theme.colors)) {
          expect(value).toMatch(hexRegex);
        }
      }
    });

    it('themes should have border radius', () => {
      expect(LIGHT_THEME.borderRadius).toBeGreaterThan(0);
      expect(DARK_THEME.borderRadius).toBeGreaterThan(0);
    });

    it('themes should have font family', () => {
      expect(LIGHT_THEME.fontFamily).toBeTruthy();
      expect(DARK_THEME.fontFamily).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: Color Contrast (WCAG)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Color Contrast', () => {
  describe('hexToRgb', () => {
    it('should convert 6-digit hex', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should convert 3-digit hex', () => {
      expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle lowercase hex', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should return null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#GG')).toBeNull();
    });
  });

  describe('relativeLuminance', () => {
    it('white should have luminance close to 1', () => {
      expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 2);
    });

    it('black should have luminance close to 0', () => {
      expect(relativeLuminance('#000000')).toBeCloseTo(0, 2);
    });

    it('should return 0 for invalid color', () => {
      expect(relativeLuminance('invalid')).toBe(0);
    });
  });

  describe('contrastRatio', () => {
    it('black on white should be 21:1', () => {
      expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    });

    it('same color should be 1:1', () => {
      expect(contrastRatio('#FF0000', '#FF0000')).toBeCloseTo(1, 2);
    });

    it('should be symmetrical', () => {
      const a = contrastRatio('#000000', '#FFFFFF');
      const b = contrastRatio('#FFFFFF', '#000000');
      expect(a).toBeCloseTo(b, 5);
    });
  });

  describe('meetsWcagAA', () => {
    it('should pass for black on white', () => {
      expect(meetsWcagAA('#000000', '#FFFFFF')).toBe(true);
    });

    it('should fail for light gray on white', () => {
      expect(meetsWcagAA('#CCCCCC', '#FFFFFF')).toBe(false);
    });

    it('should pass for large text with lower threshold', () => {
      // Light gray on white might pass for large text (3:1)
      const ratio = contrastRatio('#CCCCCC', '#FFFFFF');
      expect(meetsWcagAA('#CCCCCC', '#FFFFFF', true)).toBe(ratio >= 3);
    });
  });

  describe('meetsWcagAAA', () => {
    it('should pass for black on white', () => {
      expect(meetsWcagAAA('#000000', '#FFFFFF')).toBe(true);
    });

    it('should be stricter than AA', () => {
      // A medium contrast that passes AA but not AAA
      const mediumGray = '#767676'; // ~4.5:1 against white
      expect(meetsWcagAA(mediumGray, '#FFFFFF')).toBe(true);
      expect(meetsWcagAAA(mediumGray, '#FFFFFF')).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: Responsive Breakpoints
// ═══════════════════════════════════════════════════════════════════════════════

describe('Responsive Breakpoints', () => {
  it('should have mobile breakpoint at 640', () => {
    expect(BREAKPOINTS.mobile).toBe(640);
  });

  it('should have tablet breakpoint at 768', () => {
    expect(BREAKPOINTS.tablet).toBe(768);
  });

  it('should have desktop breakpoint at 1024', () => {
    expect(BREAKPOINTS.desktop).toBe(1024);
  });

  it('should have wide breakpoint at 1280', () => {
    expect(BREAKPOINTS.wide).toBe(1280);
  });

  it('breakpoints should be in ascending order', () => {
    expect(BREAKPOINTS.mobile).toBeLessThan(BREAKPOINTS.tablet);
    expect(BREAKPOINTS.tablet).toBeLessThan(BREAKPOINTS.desktop);
    expect(BREAKPOINTS.desktop).toBeLessThan(BREAKPOINTS.wide);
  });

  describe('mediaQuery', () => {
    it('should generate correct mobile query', () => {
      expect(mediaQuery('mobile')).toBe('@media (min-width: 640px)');
    });

    it('should generate correct desktop query', () => {
      expect(mediaQuery('desktop')).toBe('@media (min-width: 1024px)');
    });
  });

  describe('categorizeViewport', () => {
    it('should categorize small screens as mobile', () => {
      expect(categorizeViewport(320)).toBe('mobile');
      expect(categorizeViewport(639)).toBe('mobile');
    });

    it('should categorize medium screens as tablet', () => {
      expect(categorizeViewport(768)).toBe('tablet');
      expect(categorizeViewport(900)).toBe('tablet');
    });

    it('should categorize large screens as desktop', () => {
      expect(categorizeViewport(1024)).toBe('desktop');
      expect(categorizeViewport(1200)).toBe('desktop');
    });

    it('should categorize very large screens as wide', () => {
      expect(categorizeViewport(1280)).toBe('wide');
      expect(categorizeViewport(1920)).toBe('wide');
    });

    it('should handle edge cases', () => {
      expect(categorizeViewport(0)).toBe('mobile');
      expect(categorizeViewport(640)).toBe('mobile'); // 640 < 768 (tablet)
      expect(categorizeViewport(768)).toBe('tablet');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 4: Accessibility Helpers
// ═══════════════════════════════════════════════════════════════════════════════

describe('Accessibility Helpers', () => {
  describe('iconButtonLabel', () => {
    it('should generate label with target', () => {
      expect(iconButtonLabel('Delete', 'message')).toBe('Delete message');
    });

    it('should generate label without target', () => {
      expect(iconButtonLabel('Close')).toBe('Close');
    });

    it('should handle empty target', () => {
      expect(iconButtonLabel('Send', '')).toBe('Send'); // empty string is falsy
    });
  });

  describe('announceToScreenReader', () => {
    it('should create polite announcement by default', () => {
      const announcement = announceToScreenReader('Loading complete');
      expect(announcement.message).toBe('Loading complete');
      expect(announcement['aria-live']).toBe('polite');
      expect(announcement['aria-atomic']).toBe(true);
    });

    it('should create assertive announcement', () => {
      const announcement = announceToScreenReader('Error occurred', 'assertive');
      expect(announcement['aria-live']).toBe('assertive');
    });
  });

  describe('validateFocusRing', () => {
    it('should validate a high-contrast focus ring', () => {
      const result = validateFocusRing('#000000', '#FFFFFF');
      expect(result.valid).toBe(true);
      expect(result.ratio).toBeGreaterThan(3);
    });

    it('should flag a low-contrast focus ring', () => {
      const result = validateFocusRing('#EEEEEE', '#FFFFFF');
      expect(result.valid).toBe(false);
      expect(result.recommendation).toContain('below');
    });
  });

  describe('auditThemeAccessibility', () => {
    it('should audit dark theme', () => {
      const audit = auditThemeAccessibility(DARK_THEME);
      expect(audit.checks).toHaveLength(5);
      expect(audit).toHaveProperty('passed');
    });

    it('should audit light theme', () => {
      const audit = auditThemeAccessibility(LIGHT_THEME);
      expect(audit.checks).toHaveLength(5);
      for (const check of audit.checks) {
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('passed');
        expect(check).toHaveProperty('ratio');
      }
    });

    it('should include text-on-background check', () => {
      const audit = auditThemeAccessibility(DARK_THEME);
      const textCheck = audit.checks.find((c) => c.name === 'Text on background');
      expect(textCheck).toBeDefined();
      expect(textCheck!.ratio).toBeGreaterThan(0);
    });

    it('dark theme text should have good contrast', () => {
      const audit = auditThemeAccessibility(DARK_THEME);
      const textCheck = audit.checks.find((c) => c.name === 'Text on background');
      expect(textCheck!.passed).toBe(true);
    });
  });
});
