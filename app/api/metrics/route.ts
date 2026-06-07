// ─────────────────────────────────────────────────────────────────────────────
// /api/metrics — Prometheus-compatible metrics endpoint
//
// Exposes system metrics in Prometheus exposition format for monitoring.
// No authentication required (same as /api/health).
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'no-store';

function prometheusMetric(name: string, value: number, labels: Record<string, string> = {}, help?: string): string {
  const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
  const lines: string[] = [];
  if (help) lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} gauge`);
  lines.push(`${name}{${labelStr}} ${value}`);
  return lines.join('\n');
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const start = Date.now();
  const metrics: string[] = [];
  const mem = process.memoryUsage();

  // ── Process Metrics ──
  metrics.push(prometheusMetric('holly_process_uptime_seconds', Math.floor(process.uptime()), {}, 'Process uptime in seconds'));
  metrics.push(prometheusMetric('holly_process_heap_used_bytes', mem.heapUsed, {}, 'Heap memory used'));
  metrics.push(prometheusMetric('holly_process_heap_total_bytes', mem.heapTotal, {}, 'Heap memory total'));
  metrics.push(prometheusMetric('holly_process_rss_bytes', mem.rss, {}, 'Resident set size'));
  metrics.push(prometheusMetric('holly_process_external_bytes', mem.external, {}, 'External memory'));

  // ── Database Metrics ──
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    metrics.push(prometheusMetric('holly_db_latency_ms', dbLatency, {}, 'Database query latency'));
    metrics.push(prometheusMetric('holly_db_connected', 1, {}, 'Database connection status'));

    // Count active goals
    const activeGoals = await prisma.goal.count({ where: { status: { in: ['pending', 'in_progress'] } } });
    metrics.push(prometheusMetric('holly_goals_active', activeGoals, {}, 'Active goals count'));

    const completedGoals = await prisma.goal.count({ where: { status: 'completed' } });
    metrics.push(prometheusMetric('holly_goals_completed_total', completedGoals, {}, 'Completed goals total'));

    const failedGoals = await prisma.goal.count({ where: { status: 'failed' } });
    metrics.push(prometheusMetric('holly_goals_failed_total', failedGoals, {}, 'Failed goals total'));
  } catch {
    metrics.push(prometheusMetric('holly_db_connected', 0, {}, 'Database connection status'));
  }

  // ── Provider Status ──
  const providers = [
    { name: 'groq', configured: !!process.env.GROQ_API_KEY },
    { name: 'openrouter', configured: !!process.env.OPENROUTER_API_KEY },
    { name: 'openai', configured: !!process.env.OPENAI_API_KEY },
    { name: 'nvidia', configured: !!process.env.NVIDIA_API_KEY },
    { name: 'deepseek', configured: !!process.env.DEEPSEEK_API_KEY },
    { name: 'groq', configured: !!process.env.GROQ_API_KEY },
    { name: 'cerebras', configured: !!process.env.CEREBRAS_API_KEY },
    { name: 'google', configured: !!process.env.GOOGLE_AI_API_KEY },
  ];
  providers.forEach(p => {
    metrics.push(prometheusMetric('holly_provider_configured', p.configured ? 1 : 0, { provider: p.name }, 'Provider configured status'));
  });

  // ── Response latency ──
  const totalLatency = Date.now() - start;
  metrics.push(prometheusMetric('holly_metrics_scrape_latency_ms', totalLatency, {}, 'Metrics endpoint scrape latency'));

  return new NextResponse(metrics.join('\n') + '\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}