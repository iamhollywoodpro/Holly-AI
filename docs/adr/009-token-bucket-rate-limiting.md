# ADR-009: Token Bucket Rate Limiting

**Date:** 2025-05-01
**Status:** ACCEPTED

## Context

Holly AI needs rate limiting to:
- Protect against abuse and DDoS attacks
- Prevent runaway LLM API costs
- Ensure fair resource allocation across users
- Differentiate limits per endpoint category (chat vs. generation vs. admin)

## Decision

Implement token bucket rate limiting in middleware. Each endpoint category has distinct limits:

| Category | Limit | Routes |
|----------|-------|--------|
| Chat | 20 req/min | `/api/chat`, `/api/conversations` |
| Generation | 6 req/min | `/api/image/*`, `/api/video/*`, `/api/music/*` |
| Code | 8 req/min | `/api/code/*` |
| Auth | 5 req/min | `/api/auth/*` |
| Admin | 30 req/min | `/api/admin/*`, `/api/monitoring/*` |
| Builder | 10 req/min | `/api/builder/*` |
| Self-Code | 3 req/min | `/api/self-code/*`, `/api/autonomy/*` |
| General | 60 req/min | Everything else |

Rate-limited responses return HTTP 429 with `Retry-After` header.

## Consequences

- `src/lib/rate-limiter.ts` implements the token bucket algorithm
- `src/lib/security/endpoint-limiter.ts` provides per-endpoint configuration
- Rate limits are checked in `middleware.ts` before reaching API routes
- Users receive clear error messages when rate-limited
- Rate limit status can be checked via `/api/security/rate-limit/check`
