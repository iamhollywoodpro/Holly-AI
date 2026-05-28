/**
 * Visual Identity — Unit Tests
 *
 * Tests the visual identity hook logic, rendering context resolution,
 * and form shape generation. Uses mocked fetch and React context.
 */

import { generateRenderingContext } from '@/lib/visual/visual-identity-engine';
import type { VisualState } from '@/lib/visual/visual-identity-engine';

// ─── Helper: create a default VisualState ────────────────────────────────────

function createDefaultState(overrides: Partial<VisualState> = {}): VisualState {
  return {
    primary: { h: 40, s: 0.7, l: 0.6 },       // Gold-ish
    secondary: { h: 350, s: 0.5, l: 0.4 },      // Crimson-ish
    accent: { h: 180, s: 0.6, l: 0.5 },         // Teal accent
    style: 'organic',
    complexity: 0.5,
    animationSpeed: 0.5,
    symmetry: 0.5,
    expressiveness: 0.5,
    glowIntensity: 0.5,
    particleDensity: 0.5,
    formRigidity: 0.3,
    relationshipDepth: 0.5,
    trustGlow: 0.5,
    collaborationMarks: 5,
    ...overrides,
  };
}

// ─── Rendering Context Generation ────────────────────────────────────────────

describe('Visual Identity: Rendering Context', () => {
  it('should generate CSS custom properties', () => {
    const state = createDefaultState();
    const ctx = generateRenderingContext(state);

    expect(ctx.cssVars).toBeDefined();
    expect(ctx.cssVars['--holly-primary']).toBeTruthy();
    expect(ctx.cssVars['--holly-secondary']).toBeTruthy();
    expect(ctx.cssVars['--holly-glow']).toBeTruthy();
    expect(ctx.cssVars['--holly-animation-speed']).toBeTruthy();
  });

  it('should generate SVG gradient definitions', () => {
    const state = createDefaultState();
    const ctx = generateRenderingContext(state);

    expect(ctx.gradients).toBeDefined();
    expect(Array.isArray(ctx.gradients)).toBe(true);
    expect(ctx.gradients.length).toBeGreaterThan(0);

    const grad = ctx.gradients[0];
    expect(grad.id).toBeTruthy();
    expect(grad.stops.length).toBeGreaterThan(0);
  });

  it('should generate animation keyframes', () => {
    const state = createDefaultState();
    const ctx = generateRenderingContext(state);

    expect(ctx.keyframes).toContain('@keyframes');
  });

  it('should generate particle system config', () => {
    const state = createDefaultState();
    const ctx = generateRenderingContext(state);

    expect(ctx.particles).toBeDefined();
    expect(ctx.particles.count).toBeGreaterThan(0);
    expect(ctx.particles.size.min).toBeLessThanOrEqual(ctx.particles.size.max);
    expect(ctx.particles.speed.min).toBeLessThanOrEqual(ctx.particles.speed.max);
    expect(['float', 'orbit', 'drift', 'pulse']).toContain(ctx.particles.behavior);
  });

  it('should generate form config based on style', () => {
    const state = createDefaultState({ style: 'organic' });
    const ctx = generateRenderingContext(state);

    expect(ctx.form).toBeDefined();
    expect(ctx.form.shape).toBe('blob');
    expect(ctx.form.baseRadius).toBeGreaterThan(0);
    expect(ctx.form.strokeWidth).toBeGreaterThan(0);
  });

  it('should generate hexagon form for geometric style', () => {
    const state = createDefaultState({ style: 'geometric' });
    const ctx = generateRenderingContext(state);

    expect(ctx.form.shape).toBe('hexagon');
    expect(ctx.form.segments).toBe(6);
  });

  it('should generate crystal form for cosmic style', () => {
    const state = createDefaultState({ style: 'cosmic' });
    const ctx = generateRenderingContext(state);

    expect(ctx.form.shape).toBe('crystal');
  });

  it('should generate circle form for minimal style', () => {
    const state = createDefaultState({ style: 'minimal' });
    const ctx = generateRenderingContext(state);

    expect(ctx.form.shape).toBe('circle');
  });

  it('should generate nebula form for expressive style', () => {
    const state = createDefaultState({ style: 'expressive' });
    const ctx = generateRenderingContext(state);

    expect(ctx.form.shape).toBe('nebula');
  });
});

// ─── State Variations ────────────────────────────────────────────────────────

describe('Visual Identity: State variations', () => {
  it('should increase particle density with higher complexity', () => {
    const lowComplexity = createDefaultState({ complexity: 0.1 });
    const highComplexity = createDefaultState({ complexity: 0.9 });

    const lowCtx = generateRenderingContext(lowComplexity);
    const highCtx = generateRenderingContext(highComplexity);

    expect(highCtx.particles.count).toBeGreaterThanOrEqual(lowCtx.particles.count);
  });

  it('should increase baseRadius with higher relationship depth', () => {
    const shallowRel = createDefaultState({ relationshipDepth: 0.1 });
    const deepRel = createDefaultState({ relationshipDepth: 0.9 });

    const shallowCtx = generateRenderingContext(shallowRel);
    const deepCtx = generateRenderingContext(deepRel);

    expect(deepCtx.form.baseRadius).toBeGreaterThan(shallowCtx.form.baseRadius);
  });

  it('should increase strokeWidth with higher trust glow', () => {
    const lowTrust = createDefaultState({ trustGlow: 0.1 });
    const highTrust = createDefaultState({ trustGlow: 0.9 });

    const lowCtx = generateRenderingContext(lowTrust);
    const highCtx = generateRenderingContext(highTrust);

    expect(highCtx.form.strokeWidth).toBeGreaterThan(lowCtx.form.strokeWidth);
  });

  it('should increase animation speed value with higher animationSpeed', () => {
    const slow = createDefaultState({ animationSpeed: 0.2 });
    const fast = createDefaultState({ animationSpeed: 0.8 });

    const slowCtx = generateRenderingContext(slow);
    const fastCtx = generateRenderingContext(fast);

    // Animation speed is a scale factor: higher animationSpeed → higher CSS value
    expect(fastCtx.cssVars['--holly-animation-speed']).toBeTruthy();
    expect(parseFloat(fastCtx.cssVars['--holly-animation-speed'])).toBeGreaterThan(
      parseFloat(slowCtx.cssVars['--holly-animation-speed']),
    );
  });

  it('should produce valid HSL color strings', () => {
    const state = createDefaultState();
    const ctx = generateRenderingContext(state);

    const hslRegex = /^hsl\(\d+, \d+%, \d+%\)$/;
    expect(ctx.cssVars['--holly-primary']).toMatch(hslRegex);
    expect(ctx.cssVars['--holly-secondary']).toMatch(hslRegex);
  });

  it('should increase distortion with lower formRigidity', () => {
    const rigid = createDefaultState({ formRigidity: 0.9 });
    const fluid = createDefaultState({ formRigidity: 0.1 });

    const rigidCtx = generateRenderingContext(rigid);
    const fluidCtx = generateRenderingContext(fluid);

    expect(fluidCtx.form.distortion).toBeGreaterThan(rigidCtx.form.distortion);
  });
});
