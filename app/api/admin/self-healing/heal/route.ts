// Self-Healing System API
// Checks real system health and applies safe auto-fixes
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

interface HealthIssue {
  component: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  autoFixable: boolean;
  fix?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { issueType, autoFix = true } = await req.json().catch(() => ({}));

    const issues: HealthIssue[] = [];
    const actions: string[]     = [];

    // ── Check 1: Database connectivity ────────────────────────────────────────
    try {
      await prisma.$queryRaw`SELECT 1`;
      issues.push({ component: 'Database', severity: 'info', description: 'Database connection healthy', autoFixable: false });
    } catch (dbErr: any) {
      issues.push({
        component: 'Database',
        severity: 'critical',
        description: `Database connection failed: ${dbErr.message}`,
        autoFixable: false,
        fix: 'Check DATABASE_URL environment variable',
      });
    }

    // ── Check 2: Groq API key ─────────────────────────────────────────────────
    if (!process.env.GROQ_API_KEY) {
      issues.push({
        component: 'AI (Groq)',
        severity: 'warning',
        description: 'GROQ_API_KEY not set — AI chat will use fallback providers',
        autoFixable: false,
        fix: 'Add GROQ_API_KEY to environment variables',
      });
    } else {
      issues.push({ component: 'AI (Groq)', severity: 'info', description: 'Groq API key configured', autoFixable: false });
    }

    // ── Check 3: Kokoro TTS ───────────────────────────────────────────────────
    if (!process.env.KOKORO_TTS_URL) {
      issues.push({
        component: 'TTS (Kokoro)',
        severity: 'warning',
        description: 'KOKORO_TTS_URL not set — voice synthesis unavailable',
        autoFixable: false,
        fix: 'Set KOKORO_TTS_URL to your Kokoro FastAPI instance',
      });
    } else {
      issues.push({ component: 'TTS (Kokoro)', severity: 'info', description: 'Kokoro TTS URL configured', autoFixable: false });
    }

    // ── Check 4: Modal GPU services ───────────────────────────────────────────
    if (!process.env.MODAL_IMAGE_URL) {
      issues.push({
        component: 'Image Generation (Modal)',
        severity: 'warning',
        description: 'MODAL_IMAGE_URL not set — falling back to Pollinations (free)',
        autoFixable: false,
        fix: 'Set MODAL_IMAGE_URL to your Modal FLUX endpoint',
      });
    } else {
      issues.push({ component: 'Image Generation (Modal)', severity: 'info', description: 'Modal image URL configured', autoFixable: false });
    }

    // ── Check 5: Suno music generation ────────────────────────────────────────
    if (!process.env.SUNO_API_KEY) {
      issues.push({
        component: 'Music Generation (Suno)',
        severity: 'info',
        description: 'SUNO_API_KEY not set — music generation unavailable',
        autoFixable: false,
        fix: 'Add SUNO_API_KEY to enable AI music generation',
      });
    } else {
      issues.push({ component: 'Music Generation (Suno)', severity: 'info', description: 'Suno API key configured', autoFixable: false });
    }

    // Filter by issueType if provided
    const filtered = issueType
      ? issues.filter(i => i.component.toLowerCase().includes(issueType.toLowerCase()) || i.severity === issueType)
      : issues;

    const critical = filtered.filter(i => i.severity === 'critical').length;
    const warnings = filtered.filter(i => i.severity === 'warning').length;

    // Auto-fix: no-op fixes we can apply (DB reconnect, cache clear, etc.)
    if (autoFix) {
      // Attempt prisma reconnect on critical DB error
      if (critical > 0) {
        try {
          await prisma.$disconnect();
          await prisma.$connect();
          actions.push('Attempted database reconnection');
        } catch { /* non-fatal */ }
      }
      if (actions.length === 0) {
        actions.push('No auto-fixable issues detected — all issues require manual configuration');
      }
    }

    const systemStatus = critical > 0 ? 'degraded' : warnings > 0 ? 'warning' : 'operational';

    return NextResponse.json({
      success: true,
      issueType: issueType ?? 'all',
      detection: {
        issuesFound: filtered.length,
        critical,
        warnings,
        issues: filtered,
      },
      healing: autoFix ? { attempted: actions.length, actions } : null,
      systemStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
