import { logger } from '@/lib/monitoring/logger';

export interface DiagnosticCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  latencyMs?: number;
  detail: string;
}

export interface DailyDiagnosticReport {
  timestamp: string;
  overallStatus: 'nominal' | 'degraded' | 'critical';
  checks: DiagnosticCheckResult[];
  summary: string;
  incidentReport?: string;
  durationMs: number;
}

const CHECK_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, timeoutMs: number = CHECK_TIMEOUT_MS): Promise<{ status: number; body: any; latencyMs: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.json();
    clearTimeout(timer);
    return { status: res.status, body, latencyMs: Date.now() - start };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function statusFromResult(passed: boolean, detail: string): DiagnosticCheckResult {
  return passed
    ? { name: '', status: 'pass', detail }
    : { name: '', status: 'fail', detail };
}

async function checkHealthEndpoint(baseUrl: string): Promise<DiagnosticCheckResult> {
  const check: DiagnosticCheckResult = { name: 'Health Endpoint', status: 'pass', detail: '' };
  try {
    const { body, latencyMs } = await fetchWithTimeout(`${baseUrl}/api/health`);
    check.latencyMs = latencyMs;
    if (body.health === 'healthy') {
      check.status = 'pass';
      check.detail = `Healthy — ${body.providers ? Object.entries(body.providers).filter(([, v]) => v).map(([k]) => k).join(', ') : 'providers active'}`;
    } else if (body.health === 'degraded') {
      check.status = 'warn';
      check.detail = `Degraded — some providers unavailable`;
    } else {
      check.status = 'fail';
      check.detail = `Critical — ${JSON.stringify(body).substring(0, 200)}`;
    }
  } catch (err: any) {
    check.status = 'fail';
    check.detail = `Unreachable: ${err.message}`;
  }
  return check;
}

async function checkTtsProviders(baseUrl: string): Promise<DiagnosticCheckResult[]> {
  const results: DiagnosticCheckResult[] = [];

  const synthesizeCheck: DiagnosticCheckResult = { name: 'TTS Synthesize Route', status: 'pass', detail: '' };
  try {
    const { status, latencyMs } = await fetchWithTimeout(`${baseUrl}/api/voice/synthesize`);
    synthesizeCheck.latencyMs = latencyMs;
    synthesizeCheck.status = status < 500 ? 'pass' : 'fail';
    synthesizeCheck.detail = status < 500 ? `Route responding (${status})` : `Server error (${status})`;
  } catch (err: any) {
    synthesizeCheck.status = 'fail';
    synthesizeCheck.detail = `Unreachable: ${err.message}`;
  }
  results.push(synthesizeCheck);

  const voxcpm2Check: DiagnosticCheckResult = { name: 'VoxCPM2 TTS', status: 'pass', detail: '' };
  const voxcpm2Url = process.env.VOXCPM2_TTS_URL;
  if (voxcpm2Url) {
    voxcpm2Check.status = 'pass';
    voxcpm2Check.detail = 'Configured (skip ping to avoid GPU wake)';
  } else {
    voxcpm2Check.status = 'warn';
    voxcpm2Check.detail = 'VOXCPM2_TTS_URL not configured';
  }
  results.push(voxcpm2Check);

  const kokoroCheck: DiagnosticCheckResult = { name: 'Kokoro TTS (Fallback)', status: 'pass', detail: '' };
  const kokoroUrl = process.env.KOKORO_TTS_URL;
  if (kokoroUrl) {
    try {
      const { status, latencyMs } = await fetchWithTimeout(kokoroUrl.replace(/\/$/, ''), CHECK_TIMEOUT_MS);
      kokoroCheck.latencyMs = latencyMs;
      kokoroCheck.status = status < 500 ? 'pass' : 'fail';
      kokoroCheck.detail = status < 500 ? `Reachable (${status}, ${latencyMs}ms)` : `Error (${status})`;
    } catch (err: any) {
      kokoroCheck.status = 'warn';
      kokoroCheck.detail = `Unreachable: ${err.message}`;
    }
  } else {
    kokoroCheck.status = 'warn';
    kokoroCheck.detail = 'KOKORO_TTS_URL not configured';
  }
  results.push(kokoroCheck);

  return results;
}

async function checkLlmProviders(): Promise<DiagnosticCheckResult> {
  const check: DiagnosticCheckResult = { name: 'LLM Providers', status: 'pass', detail: '' };
  const providers: string[] = [];
  if (process.env.GROQ_API_KEY) providers.push('Groq');
  if (process.env.OPENROUTER_API_KEY) providers.push('OpenRouter');
  if (process.env.NVIDIA_API_KEY) providers.push('NVIDIA');
  if (process.env.CF_ACCOUNT_ID_CF_AI_TOKEN) providers.push('Cloudflare');

  if (providers.length === 0) {
    check.status = 'fail';
    check.detail = 'No LLM providers configured';
  } else {
    check.status = 'pass';
    check.detail = `${providers.length} active: ${providers.join(', ')}`;
  }
  return check;
}

async function checkDatabase(): Promise<DiagnosticCheckResult[]> {
  const results: DiagnosticCheckResult[] = [];

  const dbCheck: DiagnosticCheckResult = { name: 'Database', status: 'pass', detail: '' };
  if (!process.env.DATABASE_URL) {
    dbCheck.status = 'fail';
    dbCheck.detail = 'DATABASE_URL not configured';
    results.push(dbCheck);
    return results;
  }
  try {
    const { prisma } = await import('@/lib/db');
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbCheck.latencyMs = Date.now() - start;
    dbCheck.status = 'pass';
    dbCheck.detail = `Connected (${dbCheck.latencyMs}ms)`;
  } catch (err: any) {
    dbCheck.status = 'fail';
    dbCheck.detail = `Connection failed: ${err.message}`;
  }
  results.push(dbCheck);

  const pgvectorCheck: DiagnosticCheckResult = { name: 'pgvector Semantic Memory', status: 'pass', detail: '' };
  try {
    const { prisma } = await import('@/lib/db');
    const extResult = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    if (extResult.length > 0) {
      const tableCheck = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE tablename = 'memory_embeddings'
      `;
      if (tableCheck.length > 0) {
        const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint as count FROM memory_embeddings
        `;
        pgvectorCheck.status = 'pass';
        pgvectorCheck.detail = `Active — ${count[0]?.count ?? 0} memories stored`;
      } else {
        pgvectorCheck.status = 'warn';
        pgvectorCheck.detail = 'Extension enabled but memory_embeddings table not created — run POST /api/memory/migrate-pgvector';
      }
    } else {
      pgvectorCheck.status = 'warn';
      pgvectorCheck.detail = 'Not installed — run POST /api/memory/migrate-pgvector to enable semantic memory';
    }
  } catch (err: any) {
    pgvectorCheck.status = 'warn';
    pgvectorCheck.detail = `Check failed: ${err.message}`;
  }
  results.push(pgvectorCheck);

  return results;
}

async function checkCoreApiRoutes(baseUrl: string): Promise<DiagnosticCheckResult[]> {
  const routes = [
    { path: '/api/health', name: 'Health API' },
    { path: '/api/voice/synthesize', name: 'Voice Synthesize API' },
    { path: '/api/voice/batch', name: 'Voice Batch API' },
    { path: '/api/autonomy/self-heal', name: 'Self-Heal API' },
  ];
  const results: DiagnosticCheckResult[] = [];
  for (const route of routes) {
    const check: DiagnosticCheckResult = { name: route.name, status: 'pass', detail: '' };
    try {
      const { status, latencyMs } = await fetchWithTimeout(`${baseUrl}${route.path}`);
      check.latencyMs = latencyMs;
      check.status = status < 500 ? 'pass' : 'fail';
      check.detail = status < 500 ? `OK (${status})` : `Error (${status})`;
    } catch (err: any) {
      check.status = 'fail';
      check.detail = `Unreachable: ${err.message}`;
    }
    results.push(check);
  }
  return results;
}

function buildReport(checks: DiagnosticCheckResult[], durationMs: number): DailyDiagnosticReport {
  const failed = checks.filter(c => c.status === 'fail');
  const warned = checks.filter(c => c.status === 'warn');
  const passed = checks.filter(c => c.status === 'pass');

  let overallStatus: 'nominal' | 'degraded' | 'critical';
  if (failed.length > 0) {
    overallStatus = 'critical';
  } else if (warned.length > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'nominal';
  }

  let summary: string;
  let incidentReport: string | undefined;

  if (overallStatus === 'nominal') {
    summary = `All Systems Nominal — ${passed.length}/${checks.length} checks passed`;
  } else if (overallStatus === 'degraded') {
    summary = `Systems Degraded — ${passed.length} passed, ${warned.length} warnings, ${failed.length} failures`;
  } else {
    summary = `CRITICAL — ${failed.length} failures detected`;
    incidentReport = `INCIDENT REPORT — ${new Date().toISOString()}\n`;
    incidentReport += `${'='.repeat(50)}\n\n`;
    incidentReport += `Status: ${overallStatus.toUpperCase()}\n`;
    incidentReport += `Duration: ${durationMs}ms\n\n`;
    incidentReport += `FAILED CHECKS:\n`;
    for (const f of failed) {
      incidentReport += `  ❌ ${f.name}: ${f.detail}\n`;
    }
    if (warned.length > 0) {
      incidentReport += `\nWARNINGS:\n`;
      for (const w of warned) {
        incidentReport += `  ⚠️ ${w.name}: ${w.detail}\n`;
      }
    }
    incidentReport += `\nRECOMMENDED ACTIONS:\n`;
    incidentReport += `1. HOLLY should use mirror_check to identify missing features\n`;
    incidentReport += `2. Use diagnostic_check for detailed system state\n`;
    incidentReport += `3. Use read_logs to find error details\n`;
    incidentReport += `4. Formulate fix plan and present to Steve for approval\n`;
  }

  return { timestamp: new Date().toISOString(), overallStatus, checks, summary, incidentReport, durationMs };
}

export async function runDailyDiagnostic(): Promise<DailyDiagnosticReport> {
  const start = Date.now();
  const baseUrl = process.env.HOLLY_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  logger.info('[Daily Diagnostic] Starting daily diagnostic sequence...', { category: 'daily-diagnostic' });

  const checks: DiagnosticCheckResult[] = [];

  const [healthCheck, ttsChecks, llmCheck, dbChecks, routeChecks] = await Promise.all([
    checkHealthEndpoint(baseUrl),
    checkTtsProviders(baseUrl),
    checkLlmProviders(),
    checkDatabase(),
    checkCoreApiRoutes(baseUrl),
  ]);

  checks.push(healthCheck);
  checks.push(...ttsChecks);
  checks.push(llmCheck);
  checks.push(...dbChecks);
  checks.push(...routeChecks);

  const durationMs = Date.now() - start;
  const report = buildReport(checks, durationMs);

  logger.info(`[Daily Diagnostic] Complete — ${report.summary}`, {
    category: 'daily-diagnostic',
    overallStatus: report.overallStatus,
    passed: checks.filter(c => c.status === 'pass').length,
    failed: checks.filter(c => c.status === 'fail').length,
    warned: checks.filter(c => c.status === 'warn').length,
    durationMs,
  });

  if (report.incidentReport) {
    logger.warn('[Daily Diagnostic] Incident report generated', {
      category: 'daily-diagnostic',
      incidentReport: report.incidentReport,
    });

    try {
      const { runMetamorphosisCycle } = await import('./metamorphosis-engine');
      const metamorphosis = await runMetamorphosisCycle();
      if (metamorphosis.driftDetected) {
        report.summary += ` | Metamorphosis: ${metamorphosis.summary}`;
        if (metamorphosis.prUrl) {
          report.incidentReport += `\n\nAUTO-FIX PR: ${metamorphosis.prUrl}`;
        }
      }
    } catch (err) {
      logger.warn('[Daily Diagnostic] Metamorphosis cycle failed', { category: 'daily-diagnostic', error: String(err) });
    }

    if (report.overallStatus === 'critical') {
      try {
        const baseUrl = process.env.HOLLY_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/notifications/critical-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-holly-internal': process.env.CRON_SECRET || '',
          },
          body: JSON.stringify({
            issue: `${report.overallStatus.toUpperCase()} — ${checks.filter(c => c.status === 'fail').length} system failures`,
            severity: 'total_failure',
            details: report.summary,
          }),
        });
      } catch (pushErr) {
        logger.warn('[Daily Diagnostic] Critical push failed', { category: 'daily-diagnostic', error: String(pushErr) });
      }
    }
  }

  return report;
}
