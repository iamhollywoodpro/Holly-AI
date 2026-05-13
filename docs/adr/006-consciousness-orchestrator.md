# ADR-006: Consciousness Orchestrator Pattern

**Date:** 2025-03-01
**Status:** ACCEPTED

## Context

Holly AI needs a system that processes experiences, evolves identity, and maintains emotional awareness. The system must:
- Run periodic consciousness cycles (every 6 hours)
- Process emotions, memories, and goals in parallel
- Generate insights from accumulated experiences
- Evolve Holly's personality over time

## Decision

Implement a `ConsciousnessOrchestrator` that runs parallel async pipelines:
- **Emotion Pipeline**: Process emotional signals, update emotional trajectory
- **Memory Pipeline**: Store and retrieve semantic memories
- **Identity Pipeline**: Evolve personality based on interactions
- **Goal Pipeline**: Form and track autonomous goals
- **Learning Pipeline**: Extract patterns from conversations

The orchestrator uses `Promise.allSettled` for fault tolerance — each pipeline runs independently and failures don't block others.

## Consequences

- Consciousness cycles are triggered by cron (`/api/cron/consciousness`)
- Each pipeline writes results to the database
- The `PostResponseHook` triggers immediate consciousness updates after each chat
- Emotional state is injected into chat prompts via `getEmotionalStatePrompt()`
- Holly's own emotional engine (`holly-emotional-state.ts`) runs alongside user emotion detection
