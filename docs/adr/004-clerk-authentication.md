# ADR-004: Clerk Authentication

**Date:** 2025-02-01
**Status:** ACCEPTED

## Context

Holly AI requires user authentication that:
- Works seamlessly with Next.js App Router (server + client components)
- Handles session management without custom JWT logic
- Supports OAuth providers (Google, GitHub) out of the box
- Provides user management UI (sign-in, sign-up, profile)
- Scales to production without self-hosting auth infrastructure

## Decision

Use Clerk (`@clerk/nextjs`) as the authentication provider. Clerk provides:
- Drop-in React components for sign-in/sign-up flows
- Server-side auth via `await auth()` in API routes and server components
- Client-side auth via `useUser()` and `useClerk()` hooks
- OAuth integration for GitHub (used for repo features), Google, and others
- Webhook support for user lifecycle events (sync to Prisma)

## Consequences

- All API routes must call `await auth()` from `@clerk/nextjs/server` to get `userId`
- Clerk middleware in `middleware.ts` handles session validation
- User data is mirrored to Prisma via webhook (`/api/webhooks/clerk`)
- Environment variables required: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Free tier supports up to 10,000 monthly active users
