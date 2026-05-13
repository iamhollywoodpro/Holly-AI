# ADR-003: Multi-Provider LLM Cascade Architecture

**Date:** 2025-01-20
**Status:** ACCEPTED

## Context

Holly AI needs reliable LLM access with:
- Low latency for real-time chat
- Fallback when primary provider is down
- Cost optimization across providers
- Tool calling / function calling support

## Decision

Implement a cascade architecture that tries providers in order:
1. **Groq** (primary) — fastest inference, tool calling support
2. **OpenAI** (fallback) — reliable, high quality
3. **Ollama** (local fallback) — self-hosted, no API cost

The `smart-router` module selects providers based on availability, latency, and feature requirements.

## Consequences

- Chat API (`app/api/chat/route.ts`) uses the cascade pattern
- Each provider has its own configuration in environment variables
- Tool calling format must be normalized across providers
- Streaming responses must work consistently across all providers
