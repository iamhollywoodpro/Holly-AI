# ADR-010: WCAG 2.0 Accessibility Standards

**Date:** 2025-05-01
**Status:** ACCEPTED

## Context

Holly AI should be accessible to all users, including those using assistive technologies. Requirements:
- Screen reader compatibility
- Keyboard navigation support
- Sufficient color contrast ratios
- Motion sensitivity support (reduced motion)
- Accessible form inputs and interactive elements

## Decision

Follow WCAG 2.0 AA guidelines across the Holly UI. Implementation:

- **Theme engine** (`src/lib/ux/theme-accessibility.ts`): Validates color contrast ratios, provides accessible color alternatives
- **Reduced motion**: Holly's visual identity respects `prefers-reduced-motion` media query
- **ARIA attributes**: Interactive components include proper `aria-label`, `role`, and `aria-live` regions
- **Keyboard shortcuts**: Full keyboard navigation via `useKeyboardShortcuts` hook
- **Semantic HTML**: Components use proper heading hierarchy, landmarks, and labels

## Consequences

- All UI components in `src/components/ui/` include accessibility props
- Theme changes are validated for contrast before applying
- Visual identity engine respects motion preferences
- Accessibility tests in `__tests__/ux/theme-accessibility.test.ts`
- New components must pass basic accessibility checks before merging
