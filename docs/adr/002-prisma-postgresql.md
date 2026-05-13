# ADR-002: Use Prisma ORM with PostgreSQL

**Date:** 2025-01-15
**Status:** ACCEPTED

## Context

Holly AI requires persistent storage for:
- User profiles and preferences
- Conversation history and memory
- Emotional state tracking
- Autonomous goals and execution plans
- Consciousness cycle results

## Decision

Use Prisma ORM with PostgreSQL as the primary database. Prisma provides type-safe database access, automatic migrations, and a declarative schema language.

## Consequences

- Schema changes require running `npx prisma migrate dev` or `npx prisma db push`
- All database access goes through `prisma` client imported from `@/lib/db`
- The schema file at `prisma/schema.prisma` is the single source of truth
- Connection pooling is handled via the Prisma client
- Rollback state is persisted to database (not in-memory)
