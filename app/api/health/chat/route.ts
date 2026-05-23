/**
 * HOLLY Chat Health Check
 * Tests the full chat pipeline WITHOUT requiring auth.
 * Returns diagnostic info about each step.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, { status: string; error?: string; duration_ms?: number }> = {};

  // 1. Check environment variables (API keys)
  const envCheck = {
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    NVIDIA_API_KEY: !!process.env.NVIDIA_API_KEY,
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
    CF_API_TOKEN: !!process.env.CF_API_TOKEN,
    CF_ACCOUNT_ID: !!process.env.CF_ACCOUNT_ID,
    OLLAMA_ENABLED: process.env.OLLAMA_ENABLED,
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
    // Check for the problematic redirect vars
    NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL || 'NOT SET',
    NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL || 'NOT SET',
  };
  results['env_vars'] = { status: 'ok', ...envCheck } as any;

  // 2. Check smart router
  try {
    const start = Date.now();
    const { smartRoute, classifyTask } = await import('@/lib/ai/smart-router');
    const task = classifyTask('Hi Holly', false);
    const routing = await smartRoute('Hi Holly', { forceTask: task });
    results['smart_router'] = {
      status: 'ok',
      duration_ms: Date.now() - start,
      error: JSON.stringify({
        taskType: routing.taskType,
        waterfallCount: routing.waterfall.length,
        primary: routing.primary?.displayName || 'NONE',
        reason: routing.reason,
      }),
    } as any;
  } catch (e: any) {
    results['smart_router'] = { status: 'error', error: e.message };
  }

  // 3. Check provider isConfigured
  try {
    const { PROVIDERS } = await import('@/lib/ai/providers/free-providers');
    const providerStatus: Record<string, boolean> = {};
    for (const [name, provider] of Object.entries(PROVIDERS)) {
      providerStatus[name] = (provider as any).isConfigured();
    }
    results['providers'] = { status: 'ok', error: JSON.stringify(providerStatus) } as any;
  } catch (e: any) {
    results['providers'] = { status: 'error', error: e.message };
  }

  // 4. Check database connection
  try {
    const start = Date.now();
    const { prisma } = await import('@/lib/db');
    await prisma.$queryRaw`SELECT 1`;
    results['database'] = { status: 'ok', duration_ms: Date.now() - start };
  } catch (e: any) {
    results['database'] = { status: 'error', error: e.message };
  }

  // 5. Check prompt builder
  try {
    const { buildPrompt } = await import('@/lib/chat/prompt-builder');
    const prompt = buildPrompt({
      detectedMode: 'default',
      userName: 'Test',
      isCreator: false,
      isSelfCode: false,
      isInformationalMsg: false,
      latestUserMessage: 'Hi',
    });
    results['prompt_builder'] = {
      status: 'ok',
      error: `Prompt length: ${prompt.length} chars`,
    } as any;
  } catch (e: any) {
    results['prompt_builder'] = { status: 'error', error: e.message };
  }

  // 6. Check cascade (quick test with Groq)
  try {
    const start = Date.now();
    const { smartRoute } = await import('@/lib/ai/smart-router');
    const { cascade } = await import('@/lib/ai/cascade');
    const routing = await smartRoute('Say "hello"', { forceTask: 'speed' });
    let gotToken = false;
    for await (const token of cascade(routing.waterfall, [
      { role: 'system', content: 'Reply with exactly: HEALTH_CHECK_OK' },
      { role: 'user', content: 'Say hello' },
    ], { temperature: 0.1, maxTokens: 20 })) {
      gotToken = true;
      break; // Just need one token to confirm it works
    }
    results['cascade'] = {
      status: gotToken ? 'ok' : 'error',
      duration_ms: Date.now() - start,
      error: gotToken ? 'Got tokens from provider' : 'No tokens received',
    } as any;
  } catch (e: any) {
    results['cascade'] = { status: 'error', error: e.message };
  }

  const allOk = Object.values(results).every(r => r.status === 'ok');
  return NextResponse.json({ healthy: allOk, timestamp: new Date().toISOString(), results }, { status: allOk ? 200 : 500 });
}
