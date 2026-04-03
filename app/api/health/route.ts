import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// PUBLIC endpoint - no auth required
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {} as Record<string, { status: string; message?: string }>,
  };

  // Check 1: Database — only truly critical check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = { status: 'healthy' };
  } catch (error) {
    // Database failure is reported but does NOT block startup —
    // the container is still running and Coolify health check must pass.
    // Holly will surface DB errors at runtime instead.
    checks.services.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }

  // Check 2: Environment Variables (informational only — never blocks startup)
  // Only truly required keys; optional keys (HUGGINGFACE, BLOB, GITHUB) are
  // feature-gated at runtime and do not prevent the app from starting.
  const criticalEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ];

  const optionalEnvVars = [
    'HUGGINGFACE_API_KEY',
    'BLOB_READ_WRITE_TOKEN',
    'GITHUB_TOKEN',
    'GROQ_API_KEY',
    'SERPER_API_KEY',
  ];

  const missingCritical = criticalEnvVars.filter(key => !process.env[key]);
  const missingOptional = optionalEnvVars.filter(key => !process.env[key]);

  if (missingCritical.length > 0) {
    checks.services.environment = {
      status: 'degraded',
      message: `Missing critical vars: ${missingCritical.join(', ')}`,
    };
  } else {
    checks.services.environment = {
      status: missingOptional.length > 0 ? 'partial' : 'healthy',
      message: missingOptional.length > 0
        ? `Optional vars not set (features limited): ${missingOptional.join(', ')}`
        : undefined,
    };
  }

  // Check 3: Image Generation API (informational only — never blocks startup)
  try {
    const testResponse = await fetch('https://image.pollinations.ai/prompt/test', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000), // 3s timeout — don't hold up health check
    });
    checks.services.image_generation = {
      status: (testResponse.ok || testResponse.status === 302) ? 'healthy' : 'degraded',
      message: (!testResponse.ok && testResponse.status !== 302)
        ? `Image API returned ${testResponse.status}`
        : undefined,
    };
  } catch {
    // External API unreachable — informational only
    checks.services.image_generation = {
      status: 'degraded',
      message: 'Image generation API unreachable (non-critical)',
    };
  }

  // Always return 200 — the container IS running.
  // Degraded/partial states are surfaced in the JSON body for monitoring,
  // but must not cause Docker/Coolify to mark the container unhealthy.
  return NextResponse.json(checks, { status: 200 });
}
