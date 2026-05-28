# Holly AI — Documentation Suite

---

## Available Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [API Reference](./API_REFERENCE.md) | All 530+ API routes, request/response formats, deployment runbook | Developers |
| [How to Add a Feature](./HOW_TO_ADD_A_FEATURE.md) | Step-by-step: data model → service → API route → component → tests | Developers |
| [Onboarding Guide](./ONBOARDING.md) | First setup, codebase tour, conventions, first PR | New developers |
| [Integration Setup](./INTEGRATION_SETUP_GUIDE.md) | Setting up external integrations (Spotify, YouTube, GitHub, etc.) | Developers |
| [Coolify Setup](./COOLIFY-SANDBOX-SETUP.md) | Coolify deployment and sandbox setup | DevOps |
| [Coolify Env Vars](./COOLIFY_ENV_VARS.md) | Complete environment variable reference | DevOps |
| [Tools API Integration](./TOOLS_API_INTEGRATION.md) | MCP tools and API integration patterns | Developers |

### Architecture Decision Records

[docs/adr/](./adr/) — 13 records of major architectural decisions:

| # | Decision | Date |
|---|----------|------|
| ADR-001 | Next.js App Router with Server Components | 2025-01-15 |
| ADR-002 | Prisma ORM with PostgreSQL | 2025-01-15 |
| ADR-003 | Multi-Provider LLM Cascade Architecture | 2025-01-20 |
| ADR-004 | Clerk Authentication | 2025-02-01 |
| ADR-005 | MCP Tool Protocol for Extensibility | 2025-02-15 |
| ADR-006 | Consciousness Orchestrator Pattern | 2025-03-01 |
| ADR-007 | Docker Deployment with Coolify | 2025-03-15 |
| ADR-008 | Self-Code Sandbox with Graduated Promotion | 2025-04-01 |
| ADR-009 | Token Bucket Rate Limiting | 2025-05-01 |
| ADR-010 | WCAG 2.0 Accessibility Standards | 2025-05-01 |
| ADR-011 | Visual Identity Engine | 2026-05-28 |
| ADR-012 | Performance Parallelization | 2026-05-28 |
| ADR-013 | Mobile App with Expo SDK 51 | 2026-05-28 |

---

## Quick Links for New Developers

1. Start with the [Onboarding Guide](./ONBOARDING.md) — setup in 15 minutes
2. Read [How to Add a Feature](./HOW_TO_ADD_A_FEATURE.md) — learn the patterns
3. Reference the [API Reference](./API_REFERENCE.md) for endpoint details
4. Check [ADR records](./adr/) for architectural context

---

**Last Updated:** May 2026
