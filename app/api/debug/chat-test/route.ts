/**
 * GET /api/debug/chat-test?secret=CRON_SECRET
 *
 * Diagnostic endpoint — tests each step of the chat flow independently
 * to identify EXACTLY which step crashes in production.
 *
 * Secured via CRON_SECRET. Remove after debugging is complete.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Auth check
  const secret = req.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: { step: string; status: 'ok' | 'fail'; ms: number; detail: string }[] = [];

  async function testStep(step: string, fn: () => Promise<string>) {
    const start = Date.now();
    try {
      const detail = await fn();
      results.push({ step, status: 'ok', ms: Date.now() - start, detail });
    } catch (err: any) {
      results.push({ step, status: 'fail', ms: Date.now() - start, detail: `${err.message}\n${err.stack?.split('\n').slice(0, 3).join('\n') || ''}` });
    }
  }

  // Step 1: Prisma client connection
  await testStep('1-prisma-connect', async () => {
    const { prisma } = await import('@/lib/db');
    await prisma.$queryRaw`SELECT 1`;
    return 'DB connected';
  });

  // Step 2: Find a user (any user)
  let dbUserId: string | null = null;
  await testStep('2-find-user', async () => {
    const { prisma } = await import('@/lib/db');
    const user = await prisma.user.findFirst({ select: { id: true, name: true } });
    dbUserId = user?.id ?? null;
    return user ? `Found user: ${user.name} (${user.id})` : 'No users in DB';
  });

  // Step 3: Load context loader module
  await testStep('3-import-context-loader', async () => {
    const mod = await import('@/lib/chat/context-loader');
    return `Module loaded. Exports: ${Object.keys(mod).join(', ')}`;
  });

  // Step 4: Run loadChatContext
  if (dbUserId) {
    await testStep('4-load-chat-context', async () => {
      const { loadChatContext } = await import('@/lib/chat/context-loader');
      const ctx = await loadChatContext(dbUserId, undefined, 'test message', [], 'default');
      const keys = Object.keys(ctx);
      const emptyKeys = keys.filter(k => !ctx[k as keyof typeof ctx]);
      return `Context loaded. ${keys.length} keys. Empty: ${emptyKeys.length}. Filled: ${keys.length - emptyKeys.length}`;
    });
  } else {
    results.push({ step: '4-load-chat-context', status: 'fail', ms: 0, detail: 'Skipped — no user found' });
  }

  // Step 5: Build prompt
  await testStep('5-build-prompt', async () => {
    const { buildPrompt } = await import('@/lib/chat/prompt-builder');
    const prompt = buildPrompt({
      detectedMode: 'default',
      userName: 'Steve',
      isCreator: true,
      isSelfCode: false,
      isInformationalMsg: false,
      latestUserMessage: 'test',
      mcpTools: undefined,
      identityCtx: { promptBlock: '', tasteDirectives: '', partnerDirectives: '', raw: {} },
      memoryContext: '',
      semanticResults: [],
      projectContextBlock: '',
      recentLearnings: '',
      pastSummaries: [],
      tasteMatrixBlock: '',
      perceptionContext: undefined,
      audioAnalysis: undefined,
      arResult: undefined,
      imageDataUrls: undefined,
    });
    return `Prompt built. ${prompt.length} chars`;
  });

  // Step 6: Smart router
  await testStep('6-smart-route', async () => {
    const { smartRoute } = await import('@/lib/ai/smart-router');
    const routing = await smartRoute('Hello Holly', { forceTask: 'speed' });
    return `Waterfall: ${routing.waterfall.length} models. Primary: ${routing.primary?.displayName ?? 'NONE'}. Task: ${routing.taskType}`;
  });

  // Step 7: Cascade — try to get ONE token from the primary model
  await testStep('7-cascade-first-token', async () => {
    const { smartRoute } = await import('@/lib/ai/smart-router');
    const { cascade } = await import('@/lib/ai/cascade');
    const routing = await smartRoute('Say hi in one word', { forceTask: 'speed' });

    let got = '';
    for await (const token of cascade(routing.waterfall, [
      { role: 'system', content: 'You are Holly. Reply in one word.' },
      { role: 'user', content: 'Say hi' },
    ], { temperature: 0.5, maxTokens: 20 })) {
      got += token;
      if (got.length > 50) break; // Don't wait for full response
    }
    return got ? `Got response: "${got.substring(0, 100)}"` : 'EMPTY response';
  });

  // Step 8: Clerk auth module load
  await testStep('8-clerk-auth-load', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    return 'Clerk auth() imported successfully';
  });

  // Step 9: Authenticate function load
  await testStep('9-authenticate-load', async () => {
    const mod = await import('@/lib/chat/auth');
    return `Auth module loaded. Exports: ${Object.keys(mod).join(', ')}`;
  });

  // Step 10: Full auth flow (will fail without session, but tests if the function crashes)
  await testStep('10-authenticate-flow', async () => {
    const { authenticateAndLoadUser } = await import('@/lib/chat/auth');
    const result = await authenticateAndLoadUser();
    return result ? `Auth succeeded: userId=${result.userId} isCreator=${result.isCreator}` : 'No session (expected for curl)';
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    results,
    failedSteps: results.filter(r => r.status === 'fail').map(r => r.step),
  }, { status: 200 });
}
