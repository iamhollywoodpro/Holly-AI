# ADR-008: Self-Code Sandbox with Graduated Promotion

**Date:** 2025-04-01
**Status:** ACCEPTED

## Context

Holly AI needs the ability to modify her own code safely. This requires:
- Risk assessment of proposed changes
- Sandboxed testing before production
- Graduated promotion through stages
- Automatic rollback on failure

## Decision

Implement a sandbox pipeline with stages:
1. **STAGED** — Change is proposed and recorded
2. **VALIDATED** — Syntax and TypeScript checks pass
3. **APPROVED** — Risk assessment determines auto-approval or requires human review
4. **PROMOTED** — Change is applied to the codebase
5. **ROLLED_BACK** — Change was reverted due to failure

Risk levels (LOW, MEDIUM, HIGH) are determined by:
- Change ratio (characters changed / total characters)
- Number of lines changed
- File path patterns (critical files = higher risk)
- Change type ordering (safe operations first)

## Consequences

- `self-code-sandbox.ts` manages the pipeline
- `self-code-engine.ts` handles backup, TypeScript validation, and git integration
- Maximum 5 changes per cycle to prevent runaway modifications
- Critical files (middleware, Dockerfile, schema) always require approval
- All changes are committed to git with descriptive messages
