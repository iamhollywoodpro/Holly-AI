# ADR-005: MCP Tool Protocol for Extensibility

**Date:** 2025-02-15
**Status:** ACCEPTED

## Context

Holly AI needs a standardized way to expose capabilities to external AI agents and tools. Requirements:
- Structured tool definitions with input/output schemas
- Stateless execution model (request → response)
- Support for 39+ tools across categories (GitHub, web, music, creative, etc.)
- Authentication via `INTERNAL_API_SECRET` for internal/MCP calls
- Health monitoring per tool

## Decision

Implement the Model Context Protocol (MCP) using `@modelcontextprotocol/sdk`. Holly exposes an MCP server with 39 tools organized into categories:

- **GitHub** (5): Create PR, issue, list repos, search code, get file
- **Web** (3): Search, fetch page, research
- **Evolution** (3): Trigger, check status, get proposals
- **Music** (3): Generate, hybrid studio, lyrics
- **Creative** (3): Writing, philosophy, emotional analysis
- **NLP** (3): Sentiment, summarize, extract
- **Sentinel** (3): Analyze code, generate code, security scan
- **Diagnostic** (3): System diagnostic, check env, performance
- **Mirror** (3): Personality mirror, behavioral analysis
- **UI** (3): Screenshot, analyze UI, music video
- **Memory + Deploy** (4): Store, recall, search, trigger deploy
- **Other** (4): Self-code apply, proactive insights, admin monitoring

## Consequences

- MCP server runs alongside the Next.js app
- Each tool has a defined schema for inputs/outputs
- Tools are authenticated via `INTERNAL_API_SECRET`
- `src/lib/mcp/tool-health-monitor.ts` tracks tool reliability
- Adding a new tool requires: implementation, schema definition, and registration
