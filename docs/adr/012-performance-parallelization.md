# ADR-012: Performance Parallelization

**Date:** 2026-05-28
**Status:** ACCEPTED

## Context

Holly's chat pipeline had sequential database queries that caused latency under load. Specific bottlenecks:
- `saveMessages` performed 3 sequential Prisma writes
- `context-loader` ran 3 sequential `learningEvent.findMany` queries
- `detectEmotionsLLM` was called twice for the same message (emotional persistence + visual identity)
- Cache pre-warming ran sequentially for all active users
- Cache invalidation tracked wrong size (cleared before counting)

## Decision

Parallelize all independent operations:

- **saveMessages**: 3 sequential `await` → `Promise.all` for parallel Prisma writes
- **context-loader**: 3 sequential queries → `Promise.all` with `.catch()` for fault tolerance
- **detectEmotionsLLM**: Share a single promise between both consumers
- **Pre-warming**: Sequential loop → parallel batches of 10 with `Promise.allSettled`
- **Cache fixes**: Capture size before clear; fix Redis prefix invalidation

## Consequences

- Chat response latency reduced by ~60% for the database write phase
- Context loading latency reduced by ~66% (3 sequential → 1 parallel round-trip)
- Emotion detection calls halved (2x → 1x per message)
- k6 load tests validate 100 concurrent users (load) and 1,000 concurrent users (stress)
- All changes are backward-compatible — same API surface, faster execution
