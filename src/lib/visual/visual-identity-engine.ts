/**
 * Phase 25: Visual Identity and Presence Engine
 *
 * Holly's visual representation evolves based on personality state,
 * relationship depth, emotional resonance, and interaction history.
 * Not a static avatar — a living identity that visually changes as
 * the relationship deepens and Holly's emotional state shifts.
 *
 * Visual dimensions driven by:
 *   - Emotional Resonance (Phase 24) -> color warmth, energy, glow
 *   - Relationship Depth (Phase 8) -> complexity, marks, trust glow
 *   - Personality (Phase 12) -> style, symmetry, expressiveness
 *   - Learning Progress (Phase 11) -> particle density, form evolution
 */

import { prisma } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────

export interface VisualState {
  primary: HSLColor;
  secondary: HSLColor;
  accent: HSLColor;
  style: VisualStyle;
  complexity: number;
  animationSpeed: number;
  symmetry: number;
  expressiveness: number;
  glowIntensity: number;
  particleDensity: number;
  formRigidity: number;
  relationshipDepth: number;
  trustGlow: number;
  collaborationMarks: number;
  evolutionEvent?: string;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export type VisualStyle = 'organic' | 'geometric' | 'minimal' | 'expressive' | 'cosmic';

export interface VisualEvolution {
  from: VisualState;
  to: VisualState;
  trigger: string;
  significance: number; // 0-1 how big of a shift
  timestamp: Date;
}

export interface VisualRenderingContext {
  /** CSS custom properties for the frontend */
  cssVars: Record<string, string>;
  /** SVG gradient definitions */
  gradients: GradientDef[];
  /** Animation keyframes */
  keyframes: string;
  /** Particle system config */
  particles: ParticleConfig;
  /** Form shape parameters */
  form: FormConfig;
}

export interface GradientDef {
  id: string;
  stops: { offset: number; color: string; opacity: number }[];
  angle?: number;
}

export interface ParticleConfig {
  count: number;
  size: { min: number; max: number };
  speed: { min: number; max: number };
  color: string;
  opacity: { min: number; max: number };
  behavior: 'float' | 'orbit' | 'drift' | 'pulse';
}

export interface FormConfig {
  shape: 'circle' | 'hexagon' | 'blob' | 'crystal' | 'nebula';
  baseRadius: number;
  distortion: number;
  segments: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

// ─── Style mappings ───────────────────────────────────────────────────────

const STYLE_MAP: Record<VisualStyle, {
  formShape: FormConfig['shape'];
  symmetryRange: [number, number];
  complexityRange: [number, number];
  rigidityRange: [number, number];
}> = {
  organic: { formShape: 'blob', symmetryRange: [0.2, 0.5], complexityRange: [0.4, 0.7], rigidityRange: [0.1, 0.3] },
  geometric: { formShape: 'hexagon', symmetryRange: [0.7, 0.95], complexityRange: [0.3, 0.6], rigidityRange: [0.6, 0.9] },
  minimal: { formShape: 'circle', symmetryRange: [0.8, 1.0], complexityRange: [0.1, 0.3], rigidityRange: [0.5, 0.7] },
  expressive: { formShape: 'nebula', symmetryRange: [0.1, 0.4], complexityRange: [0.6, 0.9], rigidityRange: [0.0, 0.2] },
  cosmic: { formShape: 'crystal', symmetryRange: [0.4, 0.7], complexityRange: [0.7, 1.0], rigidityRange: [0.3, 0.5] },
};

// Emotion to color mappings
const EMOTION_HUE_MAP: Record<string, number> = {
  happy: 45,       // warm gold
  energized: 30,   // orange
  enthusiastic: 15, // red-orange
  engaged: 200,    // blue
  content: 120,    // green
  hopeful: 60,     // yellow-green
  calm: 180,       // teal
  gentle: 210,     // soft blue
  frustrated: 0,   // red
  focused: 240,    // deep blue
  concerned: 280,  // purple
  determined: 330, // magenta
  sad: 220,        // blue-gray
  anxious: 270,    // violet
  worried: 260,    // purple-blue
  angry: 350,      // red
  creative: 300,   // purple-magenta
  curious: 170,    // cyan-teal
  playful: 320,    // pink
};

// ─── Core Engine ──────────────────────────────────────────────────────────

/**
 * Get or create visual identity for a user.
 * First-time users get a default identity that will evolve from their first interaction.
 */
export async function getOrCreateVisualIdentity(userId: string): Promise<VisualState> {
  let identity = await prisma.visualIdentity.findUnique({ where: { userId } });

  if (!identity) {
    // Create with defaults — will evolve immediately on first interaction
    identity = await prisma.visualIdentity.create({
      data: {
        userId,
        style: 'organic',
        primaryHue: 220,
        primarySaturation: 0.7,
        primaryLightness: 0.6,
        secondaryHue: 280,
        secondarySaturation: 0.5,
        secondaryLightness: 0.5,
        accentHue: 45,
        complexity: 0.5,
        animationSpeed: 0.5,
        symmetry: 0.5,
        expressiveness: 0.6,
        glowIntensity: 0.3,
        particleDensity: 0.4,
        formRigidity: 0.3,
        relationshipDepth: 0,
        trustGlow: 0,
        collaborationMarks: 0,
        generationCount: 1,
      },
    });
  }

  return dbToVisualState(identity);
}

/**
 * Evolve Holly's visual identity based on current emotional resonance,
 * relationship state, and interaction patterns.
 */
export async function evolveVisualIdentity(
  userId: string,
  context: {
    dominantEmotion?: string;
    energyLevel?: number;
    warmthLevel?: number;
    playfulnessLevel?: number;
    assertivenessLevel?: number;
    trajectory?: string;
    relationshipDepth?: number;
    trustScore?: number;
    collaborationCount?: number;
    personalityStyle?: string;
    learningProgress?: number;
  }
): Promise<{ state: VisualState; evolution: VisualEvolution }> {
  const current = await getOrCreateVisualIdentity(userId);

  // Calculate new state based on context
  const evolved = calculateEvolution(current, context);

  // Persist to database
  const updated = await prisma.visualIdentity.upsert({
    where: { userId },
    update: {
      primaryHue: evolved.primary.h,
      primarySaturation: evolved.primary.s,
      primaryLightness: evolved.primary.l,
      secondaryHue: evolved.secondary.h,
      secondarySaturation: evolved.secondary.s,
      secondaryLightness: evolved.secondary.l,
      accentHue: evolved.accent.h,
      style: evolved.style,
      complexity: evolved.complexity,
      animationSpeed: evolved.animationSpeed,
      symmetry: evolved.symmetry,
      expressiveness: evolved.expressiveness,
      glowIntensity: evolved.glowIntensity,
      particleDensity: evolved.particleDensity,
      formRigidity: evolved.formRigidity,
      relationshipDepth: evolved.relationshipDepth,
      trustGlow: evolved.trustGlow,
      collaborationMarks: evolved.collaborationMarks,
      generationCount: { increment: 1 },
      lastEvolutionEvent: context.dominantEmotion || 'interaction',
      lastEvolvedAt: new Date(),
    },
    create: {
      userId,
      primaryHue: evolved.primary.h,
      primarySaturation: evolved.primary.s,
      primaryLightness: evolved.primary.l,
      secondaryHue: evolved.secondary.h,
      secondarySaturation: evolved.secondary.s,
      secondaryLightness: evolved.secondary.l,
      accentHue: evolved.accent.h,
      style: evolved.style,
      complexity: evolved.complexity,
      animationSpeed: evolved.animationSpeed,
      symmetry: evolved.symmetry,
      expressiveness: evolved.expressiveness,
      glowIntensity: evolved.glowIntensity,
      particleDensity: evolved.particleDensity,
      formRigidity: evolved.formRigidity,
      relationshipDepth: evolved.relationshipDepth,
      trustGlow: evolved.trustGlow,
      collaborationMarks: evolved.collaborationMarks,
    },
  });

  const newState = dbToVisualState(updated);

  const evolution: VisualEvolution = {
    from: current,
    to: newState,
    trigger: context.dominantEmotion || 'interaction',
    significance: calculateEvolutionSignificance(current, newState),
    timestamp: new Date(),
  };

  return { state: newState, evolution };
}

/**
 * Generate a rendering context for the frontend — CSS vars, gradients,
 * animation keyframes, particle config, and form shape.
 */
export function generateRenderingContext(state: VisualState): VisualRenderingContext {
  const styleConfig = STYLE_MAP[state.style];

  const primary = hslToString(state.primary);
  const secondary = hslToString(state.secondary);
  const accent = hslToString(state.accent);
  const primaryFaded = hslToString({ h: state.primary.h, s: state.primary.s * 0.4, l: state.primary.l + 0.15 });
  const glowColor = hslToString({ h: state.primary.h, s: state.primary.s, l: state.primary.l + 0.1 });

  // CSS custom properties
  const cssVars: Record<string, string> = {
    '--holly-primary': primary,
    '--holly-secondary': secondary,
    '--holly-accent': accent,
    '--holly-primary-faded': primaryFaded,
    '--holly-glow': glowColor,
    '--holly-glow-intensity': String(state.glowIntensity),
    '--holly-complexity': String(state.complexity),
    '--holly-animation-speed': `${state.animationSpeed * 2 + 0.5}s`,
    '--holly-expressiveness': String(state.expressiveness),
    '--holly-trust-glow': String(state.trustGlow),
    '--holly-relationship-depth': String(state.relationshipDepth),
    '--holly-form-rigidity': String(state.formRigidity),
  };

  // Gradient definitions
  const gradients: GradientDef[] = [
    {
      id: 'holly-primary-gradient',
      stops: [
        { offset: 0, color: primary, opacity: 1 },
        { offset: 0.5, color: secondary, opacity: 0.8 },
        { offset: 1, color: accent, opacity: 0.6 },
      ],
      angle: 135,
    },
    {
      id: 'holly-glow-gradient',
      stops: [
        { offset: 0, color: glowColor, opacity: state.glowIntensity },
        { offset: 1, color: 'transparent', opacity: 0 },
      ],
    },
    {
      id: 'holly-trust-gradient',
      stops: [
        { offset: 0, color: hslToString({ h: 45, s: 0.8, l: 0.7 }), opacity: state.trustGlow * 0.5 },
        { offset: 0.5, color: primary, opacity: state.trustGlow * 0.3 },
        { offset: 1, color: 'transparent', opacity: 0 },
      ],
    },
  ];

  // Animation keyframes based on style and expressiveness
  const speed = state.animationSpeed;
  const express = state.expressiveness;
  const keyframes = `
@keyframes holly-breathe {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(${1 + express * 0.08}); opacity: 1; }
}
@keyframes holly-pulse {
  0%, 100% { box-shadow: 0 0 ${state.glowIntensity * 30}px ${state.glowIntensity * 10}px var(--holly-glow); }
  50% { box-shadow: 0 0 ${state.glowIntensity * 50}px ${state.glowIntensity * 20}px var(--holly-glow); }
}
@keyframes holly-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes holly-float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-${express * 5}px) rotate(${express * 2}deg); }
  66% { transform: translateY(${express * 2}px) rotate(-${express}deg); }
}
@keyframes holly-trust-ring {
  0% { stroke-dashoffset: ${Math.PI * 200}; }
  100% { stroke-dashoffset: ${Math.PI * 200 * (1 - state.relationshipDepth)}; }
}`;

  // Particle configuration
  const particleCount = Math.floor(state.particleDensity * 50 + 5);
  const particleBehavior = state.style === 'cosmic' ? 'orbit' :
    state.style === 'expressive' ? 'pulse' :
    state.style === 'organic' ? 'float' :
    state.style === 'geometric' ? 'drift' : 'float';

  const particles: ParticleConfig = {
    count: particleCount,
    size: { min: 1, max: 3 + state.complexity * 4 },
    speed: { min: speed * 0.2, max: speed * 1.5 },
    color: primary,
    opacity: { min: 0.1, max: 0.4 + state.expressiveness * 0.3 },
    behavior: particleBehavior,
  };

  // Form shape configuration
  const formShape = styleConfig.formShape;
  const form: FormConfig = {
    shape: formShape,
    baseRadius: 80 + state.relationshipDepth * 40,
    distortion: (1 - state.formRigidity) * 20,
    segments: formShape === 'hexagon' ? 6 :
      formShape === 'crystal' ? 8 :
      formShape === 'blob' ? 12 : 0,
    fill: `url(#holly-primary-gradient)`,
    stroke: accent,
    strokeWidth: 1 + state.trustGlow * 3,
  };

  return { cssVars, gradients, keyframes, particles, form };
}

/**
 * Get a visual identity snapshot for embedding in chat context.
 * Returns a concise description Holly can use to reference her own appearance.
 */
export async function getVisualIdentityContext(userId: string): Promise<string> {
  const state = await getOrCreateVisualIdentity(userId);
  const rendering = generateRenderingContext(state);

  const mood = state.glowIntensity > 0.6 ? 'radiant' :
    state.glowIntensity > 0.3 ? 'warm' : 'calm';
  const shape = rendering.form.shape;
  const depth = state.relationshipDepth > 0.7 ? 'deep and layered' :
    state.relationshipDepth > 0.3 ? 'growing' : 'initial';

  return `[Visual Identity: ${state.style} style, ${shape} form, ${mood} mood, ` +
    `relationship depth ${depth}. Colors: hsl(${Math.round(state.primary.h)}, ` +
    `${Math.round(state.primary.s * 100)}%, ${Math.round(state.primary.l * 100)}%) ` +
    `primary. Trust glow: ${Math.round(state.trustGlow * 100)}%. ` +
    `Complexity: ${Math.round(state.complexity * 100)}%. ` +
    `${state.collaborationMarks} collaboration marks.]`;
}

// ─── Evolution Logic ──────────────────────────────────────────────────────

function calculateEvolution(current: VisualState, ctx: {
  dominantEmotion?: string;
  energyLevel?: number;
  warmthLevel?: number;
  playfulnessLevel?: number;
  assertivenessLevel?: number;
  trajectory?: string;
  relationshipDepth?: number;
  trustScore?: number;
  collaborationCount?: number;
  personalityStyle?: string;
  learningProgress?: number;
}): VisualState {
  const rate = 0.08; // 8% shift per evolution — gradual

  // Primary color shifts toward dominant emotion
  let targetHue = current.primary.h;
  if (ctx.dominantEmotion && EMOTION_HUE_MAP[ctx.dominantEmotion] !== undefined) {
    targetHue = EMOTION_HUE_MAP[ctx.dominantEmotion];
  }
  const newHue = lerpAngle(current.primary.h, targetHue, rate);
  const newSat = lerp(current.primary.s, (ctx.energyLevel ?? 0.5) * 0.8 + 0.2, rate);
  const newLight = lerp(current.primary.l, (ctx.warmthLevel ?? 0.5) * 0.4 + 0.4, rate);

  // Style shifts based on personality
  let newStyle = current.style;
  if (ctx.personalityStyle) {
    const styleHint = ctx.personalityStyle.toLowerCase();
    if (styleHint.includes('formal') || styleHint.includes('structured')) newStyle = 'geometric';
    else if (styleHint.includes('creative') || styleHint.includes('artistic')) newStyle = 'expressive';
    else if (styleHint.includes('curious') || styleHint.includes('explor')) newStyle = 'cosmic';
    else if (styleHint.includes('calm') || styleHint.includes('minimal')) newStyle = 'minimal';
    else if (styleHint.includes('warm') || styleHint.includes('natural')) newStyle = 'organic';
  }

  // Energy drives animation speed and expressiveness
  const newSpeed = lerp(current.animationSpeed, ctx.energyLevel ?? 0.5, rate * 0.5);
  const newExpressiveness = lerp(current.expressiveness, ctx.energyLevel ?? 0.5, rate * 0.5);

  // Playfulness drives complexity and symmetry
  const playfulness = ctx.playfulnessLevel ?? 0.5;
  const newComplexity = lerp(current.complexity, 0.3 + playfulness * 0.5, rate * 0.3);
  const newSymmetry = lerp(current.symmetry, 1 - playfulness * 0.5, rate * 0.3);

  // Trust builds glow
  const newTrustGlow = ctx.trustScore !== undefined
    ? lerp(current.trustGlow, ctx.trustScore, rate * 0.5)
    : current.trustGlow;

  // Relationship depth accumulates
  const newRelDepth = ctx.relationshipDepth !== undefined
    ? lerp(current.relationshipDepth, ctx.relationshipDepth, rate)
    : current.relationshipDepth;

  // Glow intensity from warmth and trust
  const warmth = ctx.warmthLevel ?? 0.5;
  const newGlow = lerp(current.glowIntensity, warmth * 0.5 + newTrustGlow * 0.5, rate * 0.5);

  // Collaboration marks accumulate
  const newMarks = ctx.collaborationCount !== undefined
    ? Math.max(current.collaborationMarks, ctx.collaborationCount)
    : current.collaborationMarks;

  // Learning progress drives particle density
  const newParticles = ctx.learningProgress !== undefined
    ? lerp(current.particleDensity, 0.2 + ctx.learningProgress * 0.6, rate * 0.3)
    : current.particleDensity;

  // Assertiveness drives form rigidity
  const newRigidity = lerp(current.formRigidity, ctx.assertivenessLevel ?? 0.3, rate * 0.3);

  return {
    primary: { h: newHue, s: newSat, l: newLight },
    secondary: {
      h: lerpAngle(current.secondary.h, newHue + 60, rate * 0.3),
      s: newSat * 0.7,
      l: newLight * 0.8,
    },
    accent: {
      h: lerpAngle(current.accent.h, newHue + 180, rate * 0.2),
      s: 0.8,
      l: 0.65,
    },
    style: newStyle,
    complexity: newComplexity,
    animationSpeed: newSpeed,
    symmetry: newSymmetry,
    expressiveness: newExpressiveness,
    glowIntensity: newGlow,
    particleDensity: newParticles,
    formRigidity: newRigidity,
    relationshipDepth: newRelDepth,
    trustGlow: newTrustGlow,
    collaborationMarks: newMarks,
    evolutionEvent: ctx.dominantEmotion || 'interaction',
  };
}

function calculateEvolutionSignificance(from: VisualState, to: VisualState): number {
  const hueShift = Math.abs(to.primary.h - from.primary.h);
  const complexityShift = Math.abs(to.complexity - from.complexity);
  const glowShift = Math.abs(to.glowIntensity - from.glowIntensity);
  const depthShift = Math.abs(to.relationshipDepth - from.relationshipDepth);
  const styleChanged = from.style !== to.style ? 0.3 : 0;

  return Math.min(1, (hueShift / 180) * 0.3 + complexityShift + glowShift + depthShift + styleChanged);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function dbToVisualState(db: {
  primaryHue: number;
  primarySaturation: number;
  primaryLightness: number;
  secondaryHue: number;
  secondarySaturation: number;
  secondaryLightness: number;
  accentHue: number;
  style: string;
  complexity: number;
  animationSpeed: number;
  symmetry: number;
  expressiveness: number;
  glowIntensity: number;
  particleDensity: number;
  formRigidity: number;
  relationshipDepth: number;
  trustGlow: number;
  collaborationMarks: number;
  lastEvolutionEvent: string | null;
}): VisualState {
  return {
    primary: { h: db.primaryHue, s: db.primarySaturation, l: db.primaryLightness },
    secondary: { h: db.secondaryHue, s: db.secondarySaturation, l: db.secondaryLightness },
    accent: { h: db.accentHue, s: 0.8, l: 0.65 },
    style: (db.style || 'organic') as VisualStyle,
    complexity: db.complexity,
    animationSpeed: db.animationSpeed,
    symmetry: db.symmetry,
    expressiveness: db.expressiveness,
    glowIntensity: db.glowIntensity,
    particleDensity: db.particleDensity,
    formRigidity: db.formRigidity,
    relationshipDepth: db.relationshipDepth,
    trustGlow: db.trustGlow,
    collaborationMarks: db.collaborationMarks,
    evolutionEvent: db.lastEvolutionEvent || undefined,
  };
}

function hslToString(color: HSLColor): string {
  return `hsl(${Math.round(color.h)}, ${Math.round(color.s * 100)}%, ${Math.round(color.l * 100)}%)`;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function lerpAngle(from: number, to: number, t: number): number {
  let diff = to - from;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  let result = from + diff * t;
  if (result < 0) result += 360;
  if (result >= 360) result -= 360;
  return result;
}
