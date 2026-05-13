import {
  filePathToRoutePath,
  extractMethods,
  extractJSDocSummary,
  extractParams,
  detectAuthRequirement,
  parseRouteFile,
  generateRouteMarkdown,
  generateApiReference,
  calculateCoverage,
  padAdrNumber,
  generateAdrMarkdown,
  generateAdrIndex,
  categorizeCommit,
  generateChangelog,
  suggestDocUpdates,
  generateHealthReport,
  RouteInfo,
  AdrRecord,
  ChangelogEntry,
  CodeChange,
} from '@/lib/docs/documentation-engine';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const SAMPLE_ROUTE_SOURCE = `/**
 * Chat API — Handles streaming chat responses with LLM providers
 *
 * Supports Groq, OpenAI, and local Ollama models with tool calling.
 */
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  // ... implementation
}

export async function GET(req: NextRequest) {
  // ... implementation
}
`;

const UNDOCUMENTED_ROUTE_SOURCE = `import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // no JSDoc
}
`;

const MULTI_LINE_JSDOC = `/**
 * Deployment API
 *
 * Handles application deployment with rollback support.
 * Validates configuration before deploying.
 * @param req - The incoming request
 * @returns Streaming response with deployment status
 */
export async function POST(req: NextRequest) {}
`;

// ─── Route Path Conversion ──────────────────────────────────────────────────

describe('Documentation Engine', () => {
  describe('filePathToRoutePath', () => {
    it('should convert simple API route', () => {
      expect(filePathToRoutePath('app/api/chat/route.ts')).toBe('/api/chat');
    });

    it('should convert nested API route', () => {
      expect(filePathToRoutePath('app/api/admin/analytics/route.ts')).toBe('/api/admin/analytics');
    });

    it('should convert dynamic segment [id] to {id}', () => {
      expect(filePathToRoutePath('app/api/conversations/[id]/route.ts')).toBe('/api/conversations/{id}');
    });

    it('should handle multiple dynamic segments', () => {
      expect(filePathToRoutePath('app/api/analytics/reports/[id]/run/route.ts')).toBe('/api/analytics/reports/{id}/run');
    });

    it('should handle .tsx extension', () => {
      expect(filePathToRoutePath('app/api/health/route.tsx')).toBe('/api/health');
    });

    it('should handle deeply nested routes', () => {
      expect(filePathToRoutePath('app/api/admin/architecture/docs/generate/route.ts')).toBe('/api/admin/architecture/docs/generate');
    });

    it('should handle catch-all segments [...slug]', () => {
      expect(filePathToRoutePath('app/api/files/[...path]/route.ts')).toBe('/api/files/{...path}');
    });
  });

  // ─── Method Extraction ──────────────────────────────────────────────────

  describe('extractMethods', () => {
    it('should extract POST method', () => {
      const source = 'export async function POST(req: NextRequest) {}';
      expect(extractMethods(source)).toEqual(['POST']);
    });

    it('should extract GET method', () => {
      const source = 'export async function GET(req: NextRequest) {}';
      expect(extractMethods(source)).toEqual(['GET']);
    });

    it('should extract multiple methods', () => {
      expect(extractMethods(SAMPLE_ROUTE_SOURCE)).toEqual(['GET', 'POST']);
    });

    it('should extract PUT and DELETE', () => {
      const source = `
        export async function PUT(req: NextRequest) {}
        export async function DELETE(req: NextRequest) {}
      `;
      expect(extractMethods(source)).toEqual(['PUT', 'DELETE']);
    });

    it('should extract PATCH method', () => {
      const source = 'export async function PATCH(req: NextRequest) {}';
      expect(extractMethods(source)).toEqual(['PATCH']);
    });

    it('should return empty array for no exports', () => {
      expect(extractMethods('// no exports')).toEqual([]);
    });

    it('should not match non-exported functions', () => {
      const source = 'async function POST() {}';
      expect(extractMethods(source)).toEqual([]);
    });

    it('should not match method names in strings', () => {
      const source = 'const method = "POST";';
      expect(extractMethods(source)).toEqual([]);
    });
  });

  // ─── JSDoc Extraction ───────────────────────────────────────────────────

  describe('extractJSDocSummary', () => {
    it('should extract single-line JSDoc', () => {
      const source = '/** Handles chat requests */\nexport async function POST() {}';
      expect(extractJSDocSummary(source)).toBe('Handles chat requests');
    });

    it('should extract multi-line JSDoc', () => {
      const summary = extractJSDocSummary(SAMPLE_ROUTE_SOURCE);
      expect(summary).toContain('Chat API');
      expect(summary).toContain('streaming chat responses');
    });

    it('should truncate to first sentence', () => {
      const summary = extractJSDocSummary(MULTI_LINE_JSDOC);
      expect(summary).toContain('Deployment API');
      expect(summary).toMatch(/\.\s*$/); // ends with period
    });

    it('should strip @param and @returns tags', () => {
      const summary = extractJSDocSummary(MULTI_LINE_JSDOC);
      expect(summary).not.toContain('@param');
      expect(summary).not.toContain('@returns');
    });

    it('should return empty string for no JSDoc', () => {
      expect(extractJSDocSummary(UNDOCUMENTED_ROUTE_SOURCE)).toBe('');
    });

    it('should return empty string for plain comments', () => {
      const source = '// This is a comment\nexport async function POST() {}';
      expect(extractJSDocSummary(source)).toBe('');
    });

    it('should handle @description tag', () => {
      const source = '/** @description This is the description */\nexport async function GET() {}';
      expect(extractJSDocSummary(source)).toBe('This is the description');
    });
  });

  // ─── Parameter Extraction ───────────────────────────────────────────────

  describe('extractParams', () => {
    it('should extract single parameter', () => {
      expect(extractParams('app/api/conversations/[id]/route.ts')).toEqual(['id']);
    });

    it('should extract multiple parameters', () => {
      expect(extractParams('app/api/users/[userId]/posts/[postId]/route.ts')).toEqual(['userId', 'postId']);
    });

    it('should return empty array for static routes', () => {
      expect(extractParams('app/api/chat/route.ts')).toEqual([]);
    });

    it('should handle catch-all parameters', () => {
      expect(extractParams('app/api/files/[...path]/route.ts')).toEqual(['...path']);
    });
  });

  // ─── Auth Detection ─────────────────────────────────────────────────────

  describe('detectAuthRequirement', () => {
    it('should detect auth() call', () => {
      const source = 'const { userId } = await auth();';
      expect(detectAuthRequirement(source)).toBe(true);
    });

    it('should detect requireAuth', () => {
      const source = 'requireAuth(request);';
      expect(detectAuthRequirement(source)).toBe(true);
    });

    it('should detect currentUser', () => {
      const source = 'const user = await currentUser();';
      expect(detectAuthRequirement(source)).toBe(true);
    });

    it('should detect withAuth wrapper', () => {
      const source = 'const handler = withAuth(async (req) => {});';
      expect(detectAuthRequirement(source)).toBe(true);
    });

    it('should return false for no auth patterns', () => {
      const source = 'export async function GET() { return Response.json({ ok: true }); }';
      expect(detectAuthRequirement(source)).toBe(false);
    });

    it('should detect authenticated keyword', () => {
      const source = 'if (!authenticated) throw new Error();';
      expect(detectAuthRequirement(source)).toBe(true);
    });
  });

  // ─── Full Route Parsing ─────────────────────────────────────────────────

  describe('parseRouteFile', () => {
    it('should parse a fully documented route', () => {
      const route = parseRouteFile(SAMPLE_ROUTE_SOURCE, 'app/api/chat/route.ts');

      expect(route.filePath).toBe('app/api/chat/route.ts');
      expect(route.routePath).toBe('/api/chat');
      expect(route.methods).toEqual(['GET', 'POST']);
      expect(route.hasDocumentation).toBe(true);
      expect(route.requiresAuth).toBe(true);
      expect(route.params).toEqual([]);
    });

    it('should parse an undocumented route', () => {
      const route = parseRouteFile(UNDOCUMENTED_ROUTE_SOURCE, 'app/api/health/route.ts');

      expect(route.routePath).toBe('/api/health');
      expect(route.methods).toEqual(['POST']);
      expect(route.hasDocumentation).toBe(false);
      expect(route.summary).toBe('');
    });

    it('should parse route with dynamic params', () => {
      const source = '/** Get conversation */\nexport async function GET() {}';
      const route = parseRouteFile(source, 'app/api/conversations/[id]/route.ts');

      expect(route.params).toEqual(['id']);
      expect(route.routePath).toBe('/api/conversations/{id}');
    });
  });

  // ─── Route Markdown Generation ──────────────────────────────────────────

  describe('generateRouteMarkdown', () => {
    it('should generate markdown for a documented route', () => {
      const route: RouteInfo = {
        filePath: 'app/api/chat/route.ts',
        routePath: '/api/chat',
        methods: ['POST'],
        summary: 'Handles chat requests',
        hasDocumentation: true,
        requiresAuth: true,
        params: [],
      };

      const md = generateRouteMarkdown(route);
      expect(md).toContain('### `/api/chat`');
      expect(md).toContain('Handles chat requests');
      expect(md).toContain('`POST`');
      expect(md).toContain('Required ✅');
      expect(md).toContain('Yes ✅');
    });

    it('should include parameters in markdown', () => {
      const route: RouteInfo = {
        filePath: 'app/api/conversations/[id]/route.ts',
        routePath: '/api/conversations/{id}',
        methods: ['GET'],
        summary: '',
        hasDocumentation: false,
        requiresAuth: false,
        params: ['id'],
      };

      const md = generateRouteMarkdown(route);
      expect(md).toContain('`id`');
      expect(md).toContain('No ❌');
    });

    it('should handle route with no methods', () => {
      const route: RouteInfo = {
        filePath: 'app/api/empty/route.ts',
        routePath: '/api/empty',
        methods: [],
        summary: '',
        hasDocumentation: false,
        requiresAuth: false,
        params: [],
      };

      const md = generateRouteMarkdown(route);
      expect(md).toContain('Not detected');
    });
  });

  // ─── API Reference Generation ───────────────────────────────────────────

  describe('generateApiReference', () => {
    it('should generate a full API reference document', () => {
      const routes: RouteInfo[] = [
        {
          filePath: 'app/api/chat/route.ts',
          routePath: '/api/chat',
          methods: ['POST'],
          summary: 'Chat API',
          hasDocumentation: true,
          requiresAuth: true,
          params: [],
        },
        {
          filePath: 'app/api/health/route.ts',
          routePath: '/api/health',
          methods: ['GET'],
          summary: '',
          hasDocumentation: false,
          requiresAuth: false,
          params: [],
        },
      ];

      const doc = generateApiReference(routes);
      expect(doc).toContain('# API Reference');
      expect(doc).toContain('**Total Routes:** 2');
      expect(doc).toContain('50%'); // coverage
      expect(doc).toContain('/api/chat');
      expect(doc).toContain('/api/health');
    });

    it('should group routes by top-level segment', () => {
      const routes: RouteInfo[] = [
        {
          filePath: 'app/api/admin/analytics/route.ts',
          routePath: '/api/admin/analytics',
          methods: ['GET'],
          summary: '',
          hasDocumentation: false,
          requiresAuth: false,
          params: [],
        },
        {
          filePath: 'app/api/admin/metrics/route.ts',
          routePath: '/api/admin/metrics',
          methods: ['GET'],
          summary: '',
          hasDocumentation: false,
          requiresAuth: false,
          params: [],
        },
      ];

      const doc = generateApiReference(routes);
      expect(doc).toContain('## `admin`');
    });

    it('should handle empty routes array', () => {
      const doc = generateApiReference([]);
      expect(doc).toContain('**Total Routes:** 0');
      expect(doc).toContain('0%');
    });

    it('should use custom title', () => {
      const doc = generateApiReference([], 'Custom Title');
      expect(doc).toContain('# Custom Title');
    });
  });

  // ─── Coverage Calculation ───────────────────────────────────────────────

  describe('calculateCoverage', () => {
    it('should calculate 100% coverage', () => {
      const routes: RouteInfo[] = [
        {
          filePath: 'app/api/a/route.ts',
          routePath: '/api/a',
          methods: ['GET'],
          summary: 'Doc A',
          hasDocumentation: true,
          requiresAuth: false,
          params: [],
        },
        {
          filePath: 'app/api/b/route.ts',
          routePath: '/api/b',
          methods: ['POST'],
          summary: 'Doc B',
          hasDocumentation: true,
          requiresAuth: true,
          params: [],
        },
      ];

      const coverage = calculateCoverage(routes);
      expect(coverage.totalRoutes).toBe(2);
      expect(coverage.documentedRoutes).toBe(2);
      expect(coverage.coveragePercent).toBe(100);
      expect(coverage.authProtectedRoutes).toBe(1);
      expect(coverage.undocumentedRoutes).toEqual([]);
    });

    it('should calculate 0% coverage', () => {
      const routes: RouteInfo[] = [
        {
          filePath: 'app/api/a/route.ts',
          routePath: '/api/a',
          methods: ['GET'],
          summary: '',
          hasDocumentation: false,
          requiresAuth: false,
          params: [],
        },
      ];

      const coverage = calculateCoverage(routes);
      expect(coverage.coveragePercent).toBe(0);
      expect(coverage.undocumentedRoutes).toEqual(['/api/a']);
    });

    it('should handle empty routes', () => {
      const coverage = calculateCoverage([]);
      expect(coverage.totalRoutes).toBe(0);
      expect(coverage.coveragePercent).toBe(0);
    });

    it('should calculate partial coverage', () => {
      const routes: RouteInfo[] = Array.from({ length: 10 }, (_, i) => ({
        filePath: `app/api/r${i}/route.ts`,
        routePath: `/api/r${i}`,
        methods: ['GET'] as string[],
        summary: i < 3 ? `Doc ${i}` : '',
        hasDocumentation: i < 3,
        requiresAuth: false,
        params: [] as string[],
      }));

      const coverage = calculateCoverage(routes);
      expect(coverage.coveragePercent).toBe(30);
      expect(coverage.undocumentedRoutes).toHaveLength(7);
    });
  });

  // ─── ADR Generation ─────────────────────────────────────────────────────

  describe('ADR Generation', () => {
    const sampleAdr: AdrRecord = {
      number: '001',
      title: 'Use Next.js App Router',
      date: '2025-01-15',
      status: 'accepted',
      context: 'Need a modern React framework with server components.',
      decision: 'Use Next.js 14 with App Router pattern.',
      consequences: 'All routes must follow the app/ directory convention.',
    };

    it('should pad ADR numbers', () => {
      expect(padAdrNumber(1)).toBe('001');
      expect(padAdrNumber(10)).toBe('010');
      expect(padAdrNumber(100)).toBe('100');
    });

    it('should generate ADR markdown', () => {
      const md = generateAdrMarkdown(sampleAdr);
      expect(md).toContain('# ADR-001: Use Next.js App Router');
      expect(md).toContain('2025-01-15');
      expect(md).toContain('ACCEPTED');
      expect(md).toContain('## Context');
      expect(md).toContain('## Decision');
      expect(md).toContain('## Consequences');
      expect(md).toContain('Next.js 14');
    });

    it('should generate ADR index', () => {
      const adrs: AdrRecord[] = [
        sampleAdr,
        {
          number: '002',
          title: 'Use Prisma ORM',
          date: '2025-01-20',
          status: 'accepted',
          context: 'Need type-safe database access.',
          decision: 'Use Prisma with PostgreSQL.',
          consequences: 'Schema changes require migrations.',
        },
      ];

      const index = generateAdrIndex(adrs);
      expect(index).toContain('# Architecture Decision Records');
      expect(index).toContain('ADR-001');
      expect(index).toContain('ADR-002');
      expect(index).toContain('Use Next.js App Router');
      expect(index).toContain('Use Prisma ORM');
    });

    it('should handle ADR with superseded status', () => {
      const adr: AdrRecord = {
        number: '003',
        title: 'Old Decision',
        date: '2025-01-01',
        status: 'superseded',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequences',
      };

      const md = generateAdrMarkdown(adr);
      expect(md).toContain('SUPERSEDED');
    });

    it('should sort ADR index by number', () => {
      const adrs: AdrRecord[] = [
        { number: '005', title: 'Fifth', date: '2025-05-01', status: 'accepted', context: '', decision: '', consequences: '' },
        { number: '002', title: 'Second', date: '2025-02-01', status: 'accepted', context: '', decision: '', consequences: '' },
        { number: '010', title: 'Tenth', date: '2025-10-01', status: 'accepted', context: '', decision: '', consequences: '' },
      ];

      const index = generateAdrIndex(adrs);
      const pos002 = index.indexOf('ADR-002');
      const pos005 = index.indexOf('ADR-005');
      const pos010 = index.indexOf('ADR-010');
      expect(pos002).toBeLessThan(pos005);
      expect(pos005).toBeLessThan(pos010);
    });
  });

  // ─── Commit Categorization ──────────────────────────────────────────────

  describe('categorizeCommit', () => {
    it('should categorize security commits', () => {
      expect(categorizeCommit('Fix security vulnerability in auth')).toBe('security');
      expect(categorizeCommit('Patch CVE-2024-1234')).toBe('security');
    });

    it('should categorize addition commits', () => {
      expect(categorizeCommit('Add new chat API endpoint')).toBe('added');
      expect(categorizeCommit('Create user preferences module')).toBe('added');
      expect(categorizeCommit('Implement rate limiting')).toBe('added');
      expect(categorizeCommit('New feature: voice interface')).toBe('added');
    });

    it('should categorize fix commits', () => {
      expect(categorizeCommit('Fix bug in emotion detection')).toBe('fixed');
      expect(categorizeCommit('Resolve issue with streaming')).toBe('fixed');
      expect(categorizeCommit('Patch memory leak')).toBe('fixed');
    });

    it('should categorize deprecation commits', () => {
      expect(categorizeCommit('Deprecate old API endpoint')).toBe('deprecated');
    });

    it('should categorize removal commits', () => {
      expect(categorizeCommit('Remove unused dependencies')).toBe('removed');
      expect(categorizeCommit('Delete legacy code')).toBe('removed');
    });

    it('should categorize change commits', () => {
      expect(categorizeCommit('Update documentation')).toBe('changed');
      expect(categorizeCommit('Refactor chat pipeline')).toBe('changed');
      expect(categorizeCommit('Improve error handling')).toBe('changed');
      expect(categorizeCommit('Change default model')).toBe('changed');
    });

    it('should default to changed for unknown patterns', () => {
      expect(categorizeCommit('Misc cleanup')).toBe('changed');
    });
  });

  // ─── Changelog Generation ───────────────────────────────────────────────

  describe('generateChangelog', () => {
    it('should generate changelog grouped by version', () => {
      const entries: ChangelogEntry[] = [
        { version: '1.0.0', date: '2025-01-01', category: 'added', description: 'Initial release' },
        { version: '1.0.0', date: '2025-01-01', category: 'fixed', description: 'Bug fix' },
        { version: '1.1.0', date: '2025-02-01', category: 'added', description: 'New feature' },
      ];

      const changelog = generateChangelog(entries);
      expect(changelog).toContain('# Changelog');
      expect(changelog).toContain('## 1.0.0');
      expect(changelog).toContain('## 1.1.0');
      expect(changelog).toContain('Initial release');
      expect(changelog).toContain('Bug fix');
    });

    it('should group entries by category', () => {
      const entries: ChangelogEntry[] = [
        { version: '1.0.0', date: '2025-01-01', category: 'added', description: 'Feature A' },
        { version: '1.0.0', date: '2025-01-01', category: 'added', description: 'Feature B' },
        { version: '1.0.0', date: '2025-01-01', category: 'fixed', description: 'Fix C' },
      ];

      const changelog = generateChangelog(entries);
      const addedPos = changelog.indexOf('### Added');
      const fixedPos = changelog.indexOf('### Fixed');
      expect(addedPos).toBeGreaterThan(-1);
      expect(fixedPos).toBeGreaterThan(-1);
      expect(addedPos).toBeLessThan(fixedPos); // Added comes before Fixed
    });

    it('should handle empty entries', () => {
      const changelog = generateChangelog([]);
      expect(changelog).toContain('# Changelog');
    });

    it('should include security category', () => {
      const entries: ChangelogEntry[] = [
        { version: '1.0.0', date: '2025-01-01', category: 'security', description: 'Fixed XSS vulnerability' },
      ];

      const changelog = generateChangelog(entries);
      expect(changelog).toContain('### Security');
      expect(changelog).toContain('Fixed XSS vulnerability');
    });
  });

  // ─── Self-Documentation Suggestions ─────────────────────────────────────

  describe('suggestDocUpdates', () => {
    it('should suggest API reference update for route changes', () => {
      const changes: CodeChange[] = [
        { filePath: 'app/api/chat/route.ts', changeType: 'modified' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].targetDoc).toBe('docs/api-reference.md');
      expect(suggestions[0].priority).toBe('medium');
    });

    it('should mark new API routes as high priority', () => {
      const changes: CodeChange[] = [
        { filePath: 'app/api/new-feature/route.ts', changeType: 'added' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions[0].priority).toBe('high');
    });

    it('should suggest removal for deleted routes', () => {
      const changes: CodeChange[] = [
        { filePath: 'app/api/legacy/route.ts', changeType: 'deleted' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions[0].suggestedAction).toContain('Remove');
    });

    it('should suggest architecture update for schema changes', () => {
      const changes: CodeChange[] = [
        { filePath: 'prisma/schema.prisma', changeType: 'modified' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].targetDoc).toBe('docs/architecture.md');
      expect(suggestions[0].priority).toBe('high');
    });

    it('should suggest consciousness docs for consciousness changes', () => {
      const changes: CodeChange[] = [
        { filePath: 'src/lib/consciousness/orchestrator.ts', changeType: 'modified' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].targetDoc).toBe('docs/consciousness.md');
    });

    it('should suggest deployment docs for middleware changes', () => {
      const changes: CodeChange[] = [
        { filePath: 'middleware.ts', changeType: 'modified' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].targetDoc).toBe('docs/deployment.md');
      expect(suggestions[0].priority).toBe('high');
    });

    it('should suggest deployment docs for Docker changes', () => {
      const changes: CodeChange[] = [
        { filePath: 'Dockerfile', changeType: 'modified' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].targetDoc).toBe('docs/deployment.md');
    });

    it('should skip test file changes', () => {
      const changes: CodeChange[] = [
        { filePath: '__tests__/chat/test.test.ts', changeType: 'modified' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions).toHaveLength(0);
    });

    it('should suggest ADR for new modules', () => {
      const changes: CodeChange[] = [
        { filePath: 'src/lib/security/rate-limiter.ts', changeType: 'added' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.targetDoc === 'docs/adr/')).toBe(true);
    });

    it('should deduplicate suggestions', () => {
      const changes: CodeChange[] = [
        { filePath: 'app/api/chat/route.ts', changeType: 'modified' },
        { filePath: 'app/api/chat/route.ts', changeType: 'modified' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions).toHaveLength(1);
    });

    it('should handle multiple changes of different types', () => {
      const changes: CodeChange[] = [
        { filePath: 'app/api/new/route.ts', changeType: 'added' },
        { filePath: 'prisma/schema.prisma', changeType: 'modified' },
        { filePath: 'middleware.ts', changeType: 'modified' },
      ];

      const suggestions = suggestDocUpdates(changes);
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ─── Health Report ──────────────────────────────────────────────────────

  describe('generateHealthReport', () => {
    it('should generate a health report with coverage metrics', () => {
      const routes: RouteInfo[] = [
        {
          filePath: 'app/api/a/route.ts',
          routePath: '/api/a',
          methods: ['GET'],
          summary: 'Doc',
          hasDocumentation: true,
          requiresAuth: true,
          params: [],
        },
        {
          filePath: 'app/api/b/route.ts',
          routePath: '/api/b',
          methods: ['POST'],
          summary: '',
          hasDocumentation: false,
          requiresAuth: false,
          params: [],
        },
      ];

      const report = generateHealthReport(routes, 5, '2025-01-01');
      expect(report).toContain('# Documentation Health Report');
      expect(report).toContain('2'); // total routes
      expect(report).toContain('50%'); // coverage
      expect(report).toContain('/api/b'); // undocumented
      expect(report).toContain('5'); // ADR count
      expect(report).toContain('2025-01-01'); // changelog date
    });

    it('should calculate documentation score', () => {
      const routes: RouteInfo[] = Array.from({ length: 10 }, (_, i) => ({
        filePath: `app/api/r${i}/route.ts`,
        routePath: `/api/r${i}`,
        methods: ['GET'] as string[],
        summary: i < 5 ? `Doc ${i}` : '',
        hasDocumentation: i < 5,
        requiresAuth: false,
        params: [] as string[],
      }));

      const report = generateHealthReport(routes, 10, '2025-01-01');
      expect(report).toContain('Overall Documentation Score');
      // 50% coverage * 0.5 = 25, 10 ADRs * 30/10 = 30, changelog = 20 → 75
      expect(report).toContain('75/100');
    });

    it('should handle no changelog date', () => {
      const report = generateHealthReport([], 0, null);
      expect(report).toContain('Never');
    });

    it('should cap ADR contribution at 10', () => {
      const routes: RouteInfo[] = Array.from({ length: 10 }, (_, i) => ({
        filePath: `app/api/r${i}/route.ts`,
        routePath: `/api/r${i}`,
        methods: ['GET'] as string[],
        summary: `Doc ${i}`,
        hasDocumentation: true,
        requiresAuth: false,
        params: [] as string[],
      }));

      // With 100% coverage (50) + 20 ADRs (30) + changelog (20) = 100
      const report = generateHealthReport(routes, 20, '2025-01-01');
      expect(report).toContain('100/100');
    });
  });
});
