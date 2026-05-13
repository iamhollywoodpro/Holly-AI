# ADR-001: Use Next.js App Router with Server Components

**Date:** 2025-01-15
**Status:** ACCEPTED

## Context

Holly AI needs a modern web framework that supports:
- Server-side rendering for fast initial loads
- API routes for backend functionality
- Streaming responses for real-time chat
- TypeScript-first development
- Deployment flexibility (Docker, Vercel, Coolify)

## Decision

Use Next.js 14+ with the App Router pattern. All routes follow the `app/` directory convention with `route.ts` files for API endpoints and `page.tsx` for UI pages.

## Consequences

- All API routes must follow the `app/api/*/route.ts` convention
- Server Components are the default; client components require explicit `'use client'` directive
- Middleware runs on the Edge runtime
- Streaming is natively supported via `ReadableStream`
- Path alias `@/` maps to `./src/` for clean imports
