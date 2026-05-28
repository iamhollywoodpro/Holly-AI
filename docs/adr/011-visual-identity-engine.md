# ADR-011: Visual Identity Engine

**Date:** 2026-05-28
**Status:** ACCEPTED

## Context

Holly's visual presence was previously implemented with hardcoded colors and static components. Requirements:
- Colors, shapes, and animations should evolve based on Holly's emotional state
- Visual elements should reflect relationship depth, trust, and collaboration history
- Reactivity must be instant (local emotion profile) with server-driven evolution over time
- The system must generate CSS custom properties, SVG gradients, particle configs, and form shapes

## Decision

Implement a Visual Identity Engine (`src/lib/visual/visual-identity-engine.ts`) that:

- Takes a `VisualState` (emotional + relationship parameters) and produces a `VisualRenderingContext`
- Rendering context includes: CSS custom properties, SVG gradient definitions, animation keyframes, particle system config, form shape config
- Style-to-form mapping: organic→blob, geometric→hexagon, minimal→circle, expressive→nebula, cosmic→crystal
- React context (`useVisualIdentity`) merges server-driven rendering with local emotion profile for instant reactivity
- Components (`AuraBackground`, `LivingHollyOrb`) consume the rendering context

## Consequences

- `VisualIdentityProvider` wraps pages, fetches rendering context every 30 seconds
- `useResolvedVisuals()` hook merges server CSS vars with local emotion colors
- Aura background uses 4 gradient layers responding to emotion in real-time
- Living orb uses server-driven colors, form shapes, particle systems, and emotion BPM
- Tests validate rendering context generation, style mapping, and state variations
