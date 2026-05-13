/**
 * Documentation Engine — Auto-generates and validates documentation for Holly AI
 *
 * Provides pure functions to:
 * - Extract API route metadata from source files
 * - Generate API reference documentation (markdown)
 * - Create Architecture Decision Records (ADRs)
 * - Validate documentation coverage
 * - Generate changelogs from commit history
 * - Self-documentation hooks for Holly's autonomous updates
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RouteInfo {
  /** e.g. "app/api/chat/route.ts" */
  filePath: string;
  /** e.g. "/api/chat" */
  routePath: string;
  /** HTTP methods exported: GET, POST, PUT, DELETE, PATCH */
  methods: string[];
  /** JSDoc summary extracted from the file */
  summary: string;
  /** Whether the route has JSDoc documentation */
  hasDocumentation: boolean;
  /** Whether the route requires authentication */
  requiresAuth: boolean;
  /** Extracted parameter names from dynamic segments */
  params: string[];
}

export interface AdrRecord {
  /** ADR number, e.g. "001" */
  number: string;
  /** Short title */
  title: string;
  /** Date of the decision */
  date: string;
  /** Status: proposed | accepted | deprecated | superseded */
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  /** Why this decision was needed */
  context: string;
  /** What was decided */
  decision: string;
  /** Impact of the decision */
  consequences: string;
}

export interface ChangelogEntry {
  /** Semver or label */
  version: string;
  /** ISO date */
  date: string;
  /** Category: added | changed | fixed | deprecated | removed | security */
  category: 'added' | 'changed' | 'fixed' | 'deprecated' | 'removed' | 'security';
  /** Short description */
  description: string;
}

export interface DocumentationCoverage {
  totalRoutes: number;
  documentedRoutes: number;
  authProtectedRoutes: number;
  undocumentedRoutes: string[];
  coveragePercent: number;
}

// ─── Route Extraction ───────────────────────────────────────────────────────

/**
 * Convert a file path like "app/api/chat/route.ts" to "/api/chat"
 */
export function filePathToRoutePath(filePath: string): string {
  // Remove "app/" prefix and "/route.ts" suffix
  let route = filePath
    .replace(/^app\//, '/')
    .replace(/\/route\.ts$/, '')
    .replace(/\/route\.tsx$/, '');

  // Convert [id] dynamic segments to {id}
  route = route.replace(/\[([^\]]+)\]/g, (_, param) => `{${param}}`);

  return route;
}

/**
 * Extract HTTP method names exported from a route file source.
 * Looks for `export async function GET`, `export async function POST`, etc.
 */
export function extractMethods(source: string): string[] {
  const methods: string[] = [];
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  for (const method of httpMethods) {
    const regex = new RegExp(`export\\s+async\\s+function\\s+${method}\\b`);
    if (regex.test(source)) {
      methods.push(method);
    }
  }

  return methods;
}

/**
 * Extract JSDoc summary from source code.
 * Looks for the first JSDoc comment block (/** ... *​/) before an exported function.
 */
export function extractJSDocSummary(source: string): string {
  // Match JSDoc blocks: /** ... */
  // Capture everything between /** and */
  const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
  const match = jsdocRegex.exec(source);

  if (!match) return '';

  // Clean up the extracted text
  let summary = match[1]
    .split('\n')
    .map(line => line.replace(/^\s*\*?\s?/, '').trim())
    .map(line => {
      // Handle @description tag — strip it but keep the text
      const descMatch = line.match(/^@description\s+(.*)/);
      return descMatch ? descMatch[1] : line;
    })
    .filter(line => line && !line.startsWith('@'))
    .join(' ')
    .trim();

  // Truncate to first sentence
  const sentenceEnd = summary.search(/[.!?]\s/);
  if (sentenceEnd > 0 && sentenceEnd < summary.length - 1) {
    summary = summary.substring(0, sentenceEnd + 1);
  }

  return summary;
}

/**
 * Extract dynamic parameter names from a file path.
 * "app/api/conversations/[id]/messages/route.ts" → ["id"]
 */
export function extractParams(filePath: string): string[] {
  const matches = filePath.match(/\[([^\]]+)\]/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/[\[\]]/g, ''));
}

/**
 * Check if source code appears to require authentication.
 * Looks for Clerk auth() calls or similar patterns.
 */
export function detectAuthRequirement(source: string): boolean {
  const authPatterns = [
    /\bauth\(\)/,
    /\brequireAuth/,
    /\bgetAuth\(/,
    /\bcurrentUser\(/,
    /clerkMiddleware/,
    /\bwithAuth\(/,
    /\bauthenticated/,
    /\buserId.*!.*null/,
  ];

  return authPatterns.some(pattern => pattern.test(source));
}

/**
 * Fully parse a route file source into a RouteInfo object.
 */
export function parseRouteFile(source: string, filePath: string): RouteInfo {
  const summary = extractJSDocSummary(source);
  const methods = extractMethods(source);

  return {
    filePath,
    routePath: filePathToRoutePath(filePath),
    methods,
    summary,
    hasDocumentation: summary.length > 0,
    requiresAuth: detectAuthRequirement(source),
    params: extractParams(filePath),
  };
}

// ─── API Documentation Generation ───────────────────────────────────────────

/**
 * Generate a markdown API reference section for a single route.
 */
export function generateRouteMarkdown(route: RouteInfo): string {
  const lines: string[] = [];

  lines.push(`### \`${route.routePath}\``);
  lines.push('');

  if (route.summary) {
    lines.push(route.summary);
    lines.push('');
  }

  // Methods
  if (route.methods.length > 0) {
    lines.push(`**Methods:** ${route.methods.map(m => `\`${m}\``).join(', ')}`);
  } else {
    lines.push('**Methods:** _Not detected_');
  }
  lines.push('');

  // Auth
  lines.push(`**Authentication:** ${route.requiresAuth ? 'Required ✅' : 'Not required'}`);
  lines.push('');

  // Params
  if (route.params.length > 0) {
    lines.push(`**Parameters:** ${route.params.map(p => `\`${p}\``).join(', ')}`);
    lines.push('');
  }

  // Documentation status
  lines.push(`**Documented:** ${route.hasDocumentation ? 'Yes ✅' : 'No ❌'}`);
  lines.push('');

  // Source
  lines.push(`**Source:** \`${route.filePath}\``);
  lines.push('');
  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a full API reference markdown document from an array of routes.
 */
export function generateApiReference(routes: RouteInfo[], title: string = 'API Reference'): string {
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`_Auto-generated by Holly Documentation Engine_`);
  lines.push('');
  lines.push(`**Total Routes:** ${routes.length}`);
  lines.push(`**Documented:** ${routes.filter(r => r.hasDocumentation).length}`);
  lines.push(`**Coverage:** ${routes.length > 0 ? Math.round((routes.filter(r => r.hasDocumentation).length / routes.length) * 100) : 0}%`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Group by top-level path segment
  const groups = new Map<string, RouteInfo[]>();
  for (const route of routes) {
    const segments = route.routePath.split('/');
    const group = segments[2] || 'root'; // /api/{group}/...
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(route);
  }

  for (const [group, groupRoutes] of Array.from(groups.entries()).sort()) {
    lines.push(`## \`${group}\``);
    lines.push('');

    for (const route of groupRoutes.sort((a, b) => a.routePath.localeCompare(b.routePath))) {
      lines.push(generateRouteMarkdown(route));
    }
  }

  return lines.join('\n');
}

// ─── Documentation Coverage ─────────────────────────────────────────────────

/**
 * Calculate documentation coverage metrics.
 */
export function calculateCoverage(routes: RouteInfo[]): DocumentationCoverage {
  const documentedRoutes = routes.filter(r => r.hasDocumentation);
  const undocumentedRoutes = routes
    .filter(r => !r.hasDocumentation)
    .map(r => r.routePath);
  const authProtectedRoutes = routes.filter(r => r.requiresAuth).length;

  return {
    totalRoutes: routes.length,
    documentedRoutes: documentedRoutes.length,
    authProtectedRoutes,
    undocumentedRoutes,
    coveragePercent: routes.length > 0
      ? Math.round((documentedRoutes.length / routes.length) * 100)
      : 0,
  };
}

// ─── Architecture Decision Records ──────────────────────────────────────────

/**
 * Generate ADR number with zero-padding.
 */
export function padAdrNumber(num: number): string {
  return String(num).padStart(3, '0');
}

/**
 * Generate a full ADR markdown document.
 */
export function generateAdrMarkdown(adr: AdrRecord): string {
  const lines: string[] = [];

  lines.push(`# ADR-${adr.number}: ${adr.title}`);
  lines.push('');
  lines.push(`**Date:** ${adr.date}`);
  lines.push(`**Status:** ${adr.status.toUpperCase()}`);
  lines.push('');
  lines.push('## Context');
  lines.push('');
  lines.push(adr.context);
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push(adr.decision);
  lines.push('');
  lines.push('## Consequences');
  lines.push('');
  lines.push(adr.consequences);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate the ADR index markdown.
 */
export function generateAdrIndex(adrs: AdrRecord[]): string {
  const lines: string[] = [];

  lines.push('# Architecture Decision Records');
  lines.push('');
  lines.push('This directory contains records of major architectural decisions made in the Holly AI project.');
  lines.push('');
  lines.push('| Number | Title | Date | Status |');
  lines.push('|--------|-------|------|--------|');

  for (const adr of adrs.sort((a, b) => a.number.localeCompare(b.number))) {
    lines.push(`| ADR-${adr.number} | ${adr.title} | ${adr.date} | ${adr.status} |`);
  }

  lines.push('');

  return lines.join('\n');
}

// ─── Changelog Generation ───────────────────────────────────────────────────

/**
 * Categorize a commit message into a changelog category.
 */
export function categorizeCommit(message: string): ChangelogEntry['category'] {
  const lower = message.toLowerCase();

  if (/\bsecurity\b/.test(lower) || /\bvuln/.test(lower) || /\bcve[-–]?\d/.test(lower)) return 'security';
  if (/\badd\b/.test(lower) || /\bcreate\b/.test(lower) || /\bnew\b/.test(lower) || /\bimplement\b/.test(lower)) return 'added';
  if (/\bfix\b/.test(lower) || /\bbug\b/.test(lower) || /\bpatch\b/.test(lower) || /\bresolve\b/.test(lower)) return 'fixed';
  if (/\bdeprecat/.test(lower)) return 'deprecated';
  if (/\bremove\b/.test(lower) || /\bdelete\b/.test(lower)) return 'removed';
  if (/\bchange\b/.test(lower) || /\bupdate\b/.test(lower) || /\brefactor\b/.test(lower) || /\bimprov\b/.test(lower)) return 'changed';

  return 'changed';
}

/**
 * Generate a changelog markdown document from entries.
 */
export function generateChangelog(entries: ChangelogEntry[]): string {
  const lines: string[] = [];

  lines.push('# Changelog');
  lines.push('');
  lines.push('_Auto-generated by Holly Documentation Engine_');
  lines.push('');

  // Group by version
  const versions = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    if (!versions.has(entry.version)) versions.set(entry.version, []);
    versions.get(entry.version)!.push(entry);
  }

  for (const [version, versionEntries] of Array.from(versions.entries())) {
    lines.push(`## ${version}`);
    lines.push('');

    // Group by category
    const categories = new Map<string, string[]>();
    for (const entry of versionEntries) {
      if (!categories.has(entry.category)) categories.set(entry.category, []);
      categories.get(entry.category)!.push(entry.description);
    }

    const categoryOrder: ChangelogEntry['category'][] = [
      'added', 'changed', 'fixed', 'deprecated', 'removed', 'security',
    ];

    for (const cat of categoryOrder) {
      const descriptions = categories.get(cat);
      if (!descriptions) continue;

      lines.push(`### ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
      lines.push('');
      for (const desc of descriptions) {
        lines.push(`- ${desc}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Self-Documentation Hook ────────────────────────────────────────────────

/**
 * Generate a documentation update suggestion based on code changes.
 * Used by Holly's autonomous documentation system.
 */
export interface CodeChange {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  description?: string;
}

export interface DocUpdateSuggestion {
  targetDoc: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedAction: string;
}

export function suggestDocUpdates(changes: CodeChange[]): DocUpdateSuggestion[] {
  const suggestions: DocUpdateSuggestion[] = [];

  for (const change of changes) {
    // API route changes → API reference
    if (change.filePath.includes('app/api/')) {
      suggestions.push({
        targetDoc: 'docs/api-reference.md',
        reason: `API route ${change.changeType}: ${change.filePath}`,
        priority: change.changeType === 'added' ? 'high' : 'medium',
        suggestedAction: change.changeType === 'deleted'
          ? `Remove documentation for deleted route ${filePathToRoutePath(change.filePath)}`
          : `Update documentation for ${filePathToRoutePath(change.filePath)}`,
      });
    }

    // Database schema changes → architecture docs
    if (change.filePath.includes('prisma/') || change.filePath.includes('schema.prisma')) {
      suggestions.push({
        targetDoc: 'docs/architecture.md',
        reason: `Database schema ${change.changeType}: ${change.filePath}`,
        priority: 'high',
        suggestedAction: 'Update database schema documentation and entity relationship diagram',
      });
    }

    // Consciousness system changes → consciousness docs
    if (change.filePath.includes('consciousness/')) {
      suggestions.push({
        targetDoc: 'docs/consciousness.md',
        reason: `Consciousness module ${change.changeType}: ${change.filePath}`,
        priority: 'medium',
        suggestedAction: `Update consciousness documentation for ${change.filePath}`,
      });
    }

    // Middleware changes → deployment docs
    if (change.filePath === 'middleware.ts') {
      suggestions.push({
        targetDoc: 'docs/deployment.md',
        reason: 'Middleware configuration changed',
        priority: 'high',
        suggestedAction: 'Review and update deployment documentation for middleware changes',
      });
    }

    // Docker/deployment changes
    if (change.filePath.includes('Dockerfile') || change.filePath.includes('docker-compose')) {
      suggestions.push({
        targetDoc: 'docs/deployment.md',
        reason: `Deployment configuration ${change.changeType}: ${change.filePath}`,
        priority: 'high',
        suggestedAction: 'Update deployment guide with new configuration details',
      });
    }

    // Test file changes → no doc update needed
    if (change.filePath.includes('__tests__/')) {
      continue;
    }

    // New ADR needed for major structural changes
    if (change.filePath.includes('src/lib/') && change.changeType === 'added') {
      const libMatch = change.filePath.match(/src\/lib\/([^/]+)\//);
      if (libMatch) {
        suggestions.push({
          targetDoc: `docs/adr/`,
          reason: `New module added: ${libMatch[1]}`,
          priority: 'low',
          suggestedAction: `Consider creating an ADR for the new ${libMatch[1]} module`,
        });
      }
    }
  }

  // Deduplicate by targetDoc + reason
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = `${s.targetDoc}:${s.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Generate a documentation health report.
 */
export function generateHealthReport(
  routes: RouteInfo[],
  adrCount: number,
  lastChangelogDate: string | null,
): string {
  const coverage = calculateCoverage(routes);

  const lines: string[] = [];
  lines.push('# Documentation Health Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## API Documentation Coverage');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total API Routes | ${coverage.totalRoutes} |`);
  lines.push(`| Documented Routes | ${coverage.documentedRoutes} |`);
  lines.push(`| Coverage | ${coverage.coveragePercent}% |`);
  lines.push(`| Auth-Protected Routes | ${coverage.authProtectedRoutes} |`);
  lines.push('');

  if (coverage.undocumentedRoutes.length > 0) {
    lines.push('### Undocumented Routes');
    lines.push('');
    for (const route of coverage.undocumentedRoutes) {
      lines.push(`- \`${route}\``);
    }
    lines.push('');
  }

  lines.push('## Architecture Decision Records');
  lines.push('');
  lines.push(`**Total ADRs:** ${adrCount}`);
  lines.push('');

  lines.push('## Changelog');
  lines.push('');
  lines.push(`**Last Updated:** ${lastChangelogDate || 'Never'}`);
  lines.push('');

  // Overall score
  const docScore = Math.min(100, Math.round(
    (coverage.coveragePercent * 0.5) + // 50% weight on API coverage
    (Math.min(adrCount, 10) / 10 * 30) + // 30% weight on ADRs (max at 10)
    (lastChangelogDate ? 20 : 0), // 20% weight on changelog freshness
  ));

  lines.push('## Overall Documentation Score');
  lines.push('');
  lines.push(`**${docScore}/100**`);
  lines.push('');

  return lines.join('\n');
}
