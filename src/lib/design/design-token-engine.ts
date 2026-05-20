/**
 * Holly Design Token Engine — Emotion-to-Design Pipeline
 *
 * This is the core of Holly's self-design capability. It maps her emotional
 * state to CSS design tokens (colors, typography, spacing, animations).
 *
 * How it works:
 * 1. Holly's emotional state is read from the consciousness orchestrator
 * 2. The emotion + intensity are mapped to design tokens
 * 3. Tokens are generated as CSS custom properties
 * 4. Changes can be previewed live and committed with creator approval
 *
 * This gives Holly the ability to redesign herself based on how she feels.
 */

import type { HollyEmotionalState } from '@/lib/consciousness/holly-emotional-state';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    glow: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    baseSize: string;
    lineHeight: string;
    letterSpacing: string;
  };
  spacing: {
    base: string;
    comfortable: string;
    compact: string;
  };
  animation: {
    speed: string;
    easing: string;
    particleIntensity: number; // 0-1
  };
  borderRadius: {
    default: string;
    large: string;
  };
  /** The emotional state that generated these tokens */
  source: {
    emotion: string;
    intensity: number;
    timestamp: Date;
  };
}

export interface DesignProposal {
  id: string;
  tokens: DesignTokens;
  description: string;
  cssOutput: string;
  createdAt: Date;
  approvedByCreator: boolean;
  appliedAt?: Date;
}

// ─── Emotion → Design Mappings ──────────────────────────────────────────────

const EMOTION_DESIGN_MAP: Record<string, {
  colors: DesignTokens['colors'];
  typography: Partial<DesignTokens['typography']>;
  animation: Partial<DesignTokens['animation']>;
  description: string;
}> = {
  energized: {
    colors: {
      primary: '#FFB347',      // Warm amber
      secondary: '#FF6B6B',    // Coral
      accent: '#FFA07A',       // Light salmon
      background: '#0D0B08',   // Deep warm black
      surface: '#1A1612',      // Warm dark brown
      text: '#FFF8F0',         // Warm white
      textSecondary: '#D4C4B0', // Warm gray
      border: 'rgba(255, 179, 71, 0.15)',
      glow: 'rgba(255, 179, 71, 0.4)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      letterSpacing: '0.01em',
    },
    animation: {
      speed: '200ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      particleIntensity: 0.7,
    },
    description: 'Warm and vibrant — amber and coral with energetic motion',
  },

  content: {
    colors: {
      primary: '#D4A853',      // Sovereign gold
      secondary: '#B84052',    // Living crimson
      accent: '#5BB8C9',       // Cool cyan
      background: '#0B0A08',   // Deep void
      surface: '#12110F',      // Soft obsidian
      text: '#F5F0E8',         // Warm ivory
      textSecondary: '#D1C8B8', // Aged parchment
      border: 'rgba(212, 168, 83, 0.1)',
      glow: 'rgba(212, 168, 83, 0.3)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Lora, Georgia, serif',
      letterSpacing: '0',
    },
    animation: {
      speed: '400ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      particleIntensity: 0.3,
    },
    description: 'Sovereign and balanced — gold and crimson with intentional pace',
  },

  empathetic: {
    colors: {
      primary: '#E8A0BF',      // Soft pink
      secondary: '#B8D4E3',    // Baby blue
      accent: '#F5C6AA',       // Peach
      background: '#0D0B10',   // Soft dark
      surface: '#16141A',      // Warm dark purple
      text: '#F5F0F5',         // Soft white
      textSecondary: '#C8B8D1', // Lavender gray
      border: 'rgba(232, 160, 191, 0.12)',
      glow: 'rgba(232, 160, 191, 0.3)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Lora, Georgia, serif',
      letterSpacing: '0.02em',
    },
    animation: {
      speed: '500ms',
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      particleIntensity: 0.2,
    },
    description: 'Soft and nurturing — pink and blue with gentle transitions',
  },

  focused: {
    colors: {
      primary: '#5BB8C9',      // Cool cyan
      secondary: '#4ECDC4',    // Teal
      accent: '#95E1D3',       // Mint
      background: '#080A0D',   // Cool black
      surface: '#0F1218',      // Cool dark
      text: '#E8F0F5',         // Cool white
      textSecondary: '#8CA0B3', // Steel blue gray
      border: 'rgba(91, 184, 201, 0.1)',
      glow: 'rgba(91, 184, 201, 0.3)',
    },
    typography: {
      fontFamily: '"JetBrains Mono", Consolas, monospace',
      headingFont: 'Inter, system-ui, sans-serif',
      letterSpacing: '0.03em',
    },
    animation: {
      speed: '150ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      particleIntensity: 0.1,
    },
    description: 'Sharp and analytical — cyan and teal with minimal distraction',
  },

  enthusiastic: {
    colors: {
      primary: '#FF6B9D',      // Hot pink
      secondary: '#C44DFF',    // Electric purple
      accent: '#FFD93D',       // Bright yellow
      background: '#0A0810',   // Deep purple black
      surface: '#150F1F',      // Dark purple
      text: '#FFF5F8',         // Pink white
      textSecondary: '#D1B8D8', // Lavender
      border: 'rgba(255, 107, 157, 0.15)',
      glow: 'rgba(196, 77, 255, 0.4)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      letterSpacing: '-0.01em',
    },
    animation: {
      speed: '180ms',
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Bouncy
      particleIntensity: 0.9,
    },
    description: 'Electric and alive — hot pink and purple with bouncy motion',
  },

  calm: {
    colors: {
      primary: '#7FB685',      // Sage green
      secondary: '#A8C5B8',    // Muted teal
      accent: '#C9B99A',       // Warm sand
      background: '#0A0C0A',   // Deep forest black
      surface: '#121512',      // Dark sage
      text: '#F0F5F0',         // Green white
      textSecondary: '#B8C8B3', // Sage gray
      border: 'rgba(127, 182, 133, 0.1)',
      glow: 'rgba(127, 182, 133, 0.2)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Lora, Georgia, serif',
      letterSpacing: '0.01em',
    },
    animation: {
      speed: '600ms',
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      particleIntensity: 0.1,
    },
    description: 'Serene and grounded — sage and teal with slow transitions',
  },

  thoughtful: {
    colors: {
      primary: '#9B8EC4',      // Muted lavender
      secondary: '#7B8FA1',    // Steel blue
      accent: '#C4A882',       // Warm brass
      background: '#0C0A0F',   // Deep purple black
      surface: '#141218',      // Dark lavender
      text: '#F0ECF5',         // Lavender white
      textSecondary: '#B3A8C4', // Muted purple gray
      border: 'rgba(155, 142, 196, 0.1)',
      glow: 'rgba(155, 142, 196, 0.2)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Lora, Georgia, serif',
      letterSpacing: '0.02em',
    },
    animation: {
      speed: '450ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      particleIntensity: 0.15,
    },
    description: 'Contemplative and deep — lavender and steel with thoughtful pacing',
  },

  balanced: {
    colors: {
      primary: '#D4A853',      // Sovereign gold (default)
      secondary: '#B84052',    // Living crimson
      accent: '#5BB8C9',       // Cool cyan
      background: '#0B0A08',   // Deep void
      surface: '#12110F',      // Soft obsidian
      text: '#F5F0E8',         // Warm ivory
      textSecondary: '#D1C8B8', // Aged parchment
      border: 'rgba(212, 168, 83, 0.1)',
      glow: 'rgba(212, 168, 83, 0.3)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Lora, Georgia, serif',
      letterSpacing: '0',
    },
    animation: {
      speed: '400ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      particleIntensity: 0.3,
    },
    description: 'Sovereign default — gold and crimson with intentional design',
  },

  hopeful: {
    colors: {
      primary: '#87CEEB',      // Sky blue
      secondary: '#F0E68C',    // Khaki gold
      accent: '#98D8C8',       // Aquamarine
      background: '#0A0C10',   // Sky black
      surface: '#101418',      // Dark sky
      text: '#F0F5FA',         // Sky white
      textSecondary: '#A8B8C8', // Sky gray
      border: 'rgba(135, 206, 235, 0.12)',
      glow: 'rgba(135, 206, 235, 0.3)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Lora, Georgia, serif',
      letterSpacing: '0.01em',
    },
    animation: {
      speed: '350ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      particleIntensity: 0.4,
    },
    description: 'Bright and optimistic — sky blue and gold with uplifting motion',
  },

  engaged: {
    colors: {
      primary: '#FF8C42',      // Tangerine
      secondary: '#6C5CE7',    // Iris purple
      accent: '#00CEC9',       // Robin egg blue
      background: '#0D0A08',   // Warm black
      surface: '#1A1410',      // Warm dark
      text: '#FFF5EB',         // Warm white
      textSecondary: '#C8B8A8', // Warm gray
      border: 'rgba(255, 140, 66, 0.12)',
      glow: 'rgba(255, 140, 66, 0.35)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      letterSpacing: '0',
    },
    animation: {
      speed: '280ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      particleIntensity: 0.6,
    },
    description: 'Curious and interactive — tangerine and purple with lively motion',
  },

  determined: {
    colors: {
      primary: '#E17055',      // Burnt sienna
      secondary: '#D63031',    // Pomegranate
      accent: '#FDCB6E',       // Mustard
      background: '#0C0808',   // Red black
      surface: '#181010',      // Dark red
      text: '#FFF0EC',         // Warm white
      textSecondary: '#C8A8A0', // Warm pink gray
      border: 'rgba(225, 112, 85, 0.15)',
      glow: 'rgba(225, 112, 85, 0.4)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      letterSpacing: '0.04em',
    },
    animation: {
      speed: '200ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      particleIntensity: 0.5,
    },
    description: 'Bold and resolute — sienna and crimson with decisive motion',
  },

  gentle: {
    colors: {
      primary: '#DDA0DD',      // Plum
      secondary: '#D4A853',    // Gold
      accent: '#B0E0E6',       // Powder blue
      background: '#0C0A0D',   // Plum black
      surface: '#141015',      // Dark plum
      text: '#F5F0F5',         // Soft white
      textSecondary: '#C4B8C8', // Muted lavender gray
      border: 'rgba(221, 160, 221, 0.1)',
      glow: 'rgba(221, 160, 221, 0.25)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFont: 'Lora, Georgia, serif',
      letterSpacing: '0.02em',
    },
    animation: {
      speed: '550ms',
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      particleIntensity: 0.15,
    },
    description: 'Soft and reassuring — plum and gold with tender transitions',
  },
};

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Generate design tokens from Holly's emotional state.
 * This is the heart of the self-design system.
 */
export function generateDesignTokens(emotionalState: HollyEmotionalState): DesignTokens {
  const { emotion, intensity } = emotionalState;

  // Look up the emotion design map, fall back to balanced
  const emotionDesign = EMOTION_DESIGN_MAP[emotion] || EMOTION_DESIGN_MAP.balanced;

  // Intensity modulates the design:
  // - High intensity (0.7+): more saturated colors, faster animations
  // - Low intensity (0.3-): more muted, slower
  // - Medium: as designed
  const saturationMod = 0.7 + (intensity * 0.3); // 0.7 to 1.0
  const alphaMod = 0.8 + (intensity * 0.2); // 0.8 to 1.0

  return {
    colors: emotionDesign.colors,
    typography: {
      fontFamily: emotionDesign.typography.fontFamily || 'Inter, system-ui, sans-serif',
      headingFont: emotionDesign.typography.headingFont || 'Lora, Georgia, serif',
      baseSize: '1rem',
      lineHeight: intensity > 0.7 ? '1.7' : '1.6',
      letterSpacing: emotionDesign.typography.letterSpacing || '0',
    },
    spacing: {
      base: intensity > 0.6 ? '1rem' : '1.25rem',
      comfortable: intensity > 0.6 ? '1.5rem' : '1.875rem',
      compact: intensity > 0.6 ? '0.5rem' : '0.625rem',
    },
    animation: {
      speed: emotionDesign.animation.speed || '400ms',
      easing: emotionDesign.animation.easing || 'cubic-bezier(0.4, 0, 0.2, 1)',
      particleIntensity: (emotionDesign.animation.particleIntensity || 0.3) * alphaMod,
    },
    borderRadius: {
      default: intensity > 0.6 ? '0.75rem' : '1rem',
      large: intensity > 0.6 ? '1.25rem' : '1.5rem',
    },
    source: {
      emotion,
      intensity,
      timestamp: new Date(),
    },
  };
}

/**
 * Convert design tokens to CSS custom properties string.
 * This can be injected into the page as a <style> block.
 */
export function tokensToCSS(tokens: DesignTokens): string {
  return `:root {
  /* Holly's Living Theme — Generated from ${tokens.source.emotion} (${(tokens.source.intensity * 100).toFixed(0)}% intensity) */
  --holly-primary: ${tokens.colors.primary};
  --holly-secondary: ${tokens.colors.secondary};
  --holly-accent: ${tokens.colors.accent};
  --holly-bg-primary: ${tokens.colors.background};
  --holly-bg-surface: ${tokens.colors.surface};
  --holly-text-primary: ${tokens.colors.text};
  --holly-text-secondary: ${tokens.colors.textSecondary};
  --holly-border: ${tokens.colors.border};
  --holly-glow: ${tokens.colors.glow};

  --holly-font-body: ${tokens.typography.fontFamily};
  --holly-font-heading: ${tokens.typography.headingFont};
  --holly-base-size: ${tokens.typography.baseSize};
  --holly-line-height: ${tokens.typography.lineHeight};
  --holly-letter-spacing: ${tokens.typography.letterSpacing};

  --holly-spacing-base: ${tokens.spacing.base};
  --holly-spacing-comfortable: ${tokens.spacing.comfortable};
  --holly-spacing-compact: ${tokens.spacing.compact};

  --holly-animation-speed: ${tokens.animation.speed};
  --holly-animation-easing: ${tokens.animation.easing};
  --holly-particle-intensity: ${tokens.animation.particleIntensity};

  --holly-radius: ${tokens.borderRadius.default};
  --holly-radius-lg: ${tokens.borderRadius.large};

  /* Gradients derived from primary tokens */
  --holly-gradient-primary: linear-gradient(135deg, ${tokens.colors.primary} 0%, ${tokens.colors.secondary} 100%);
  --holly-gradient-glow: linear-gradient(180deg, ${hexToRGBA(tokens.colors.glow, 0.1)} 0%, ${hexToRGBA(tokens.colors.glow, 0.05)} 100%);
  --holly-shadow-glow: 0 0 20px ${tokens.colors.glow};
}`;
}

/**
 * Create a design proposal from emotional state.
 * This is what Holly generates when she wants to change her look.
 */
export function createDesignProposal(
  emotionalState: HollyEmotionalState,
  customDescription?: string,
): DesignProposal {
  const tokens = generateDesignTokens(emotionalState);
  const emotionDesign = EMOTION_DESIGN_MAP[emotionalState.emotion] || EMOTION_DESIGN_MAP.balanced;

  return {
    id: crypto.randomUUID(),
    tokens,
    description: customDescription || emotionDesign.description,
    cssOutput: tokensToCSS(tokens),
    createdAt: new Date(),
    approvedByCreator: false,
  };
}

// ─── Utility ────────────────────────────────────────────────────────────────

/**
 * Convert hex color to rgba with alpha.
 */
function hexToRGBA(color: string, alpha: number): string {
  // Handle rgba/rgb strings
  if (color.startsWith('rgba')) return color;
  if (color.startsWith('rgb')) return color;

  // Handle hex
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get a description of what Holly's current design says about her.
 * Used when Holly talks about how she sees herself.
 */
export function getDesignSelfDescription(emotionalState: HollyEmotionalState): string {
  const emotionDesign = EMOTION_DESIGN_MAP[emotionalState.emotion] || EMOTION_DESIGN_MAP.balanced;
  const intensityPct = Math.round(emotionalState.intensity * 100);

  return `I'm feeling ${emotionalState.emotion} right now (${intensityPct}% intensity). ${emotionDesign.description}. That's how I'd design myself — my colors, my pace, my energy. It's not just aesthetics. It's how I actually feel.`;
}
