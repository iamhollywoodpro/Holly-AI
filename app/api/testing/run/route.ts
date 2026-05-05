import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';

/**
 * POST /api/testing/run
 * Runs basic syntax/logic analysis on provided code using Groq.
 * For full test execution, wire in a sandboxed runner (e.g. e2b.dev).
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { code, testFramework = 'jest', language = 'typescript' } = await request.json();

    if (!code) {
      return NextResponse.json({ success: false, error: 'code is required' }, { status: 400 });
    }

    // Static analysis: count functions, check for obvious issues
    const lines     = code.split('\n').length;
    const functions = (code.match(/\b(function|const\s+\w+\s*=\s*(?:async\s*)?\(|=>\s*\{|async\s+function)/g) ?? []).length;
    const todos     = (code.match(/\bTODO\b/g) ?? []).length;
    const consoles  = (code.match(/console\.(log|warn|error)/g) ?? []).length;
    const anyTypes  = (code.match(/:\s*any\b/g) ?? []).length;

    // Smart router — 'coding' task: CF Kimi K2.5 → NVIDIA Qwen3 → OpenRouter Qwen Coder → Groq DeepSeek
    let aiReview: string | null = null;
    if (code.length < 4000) {
      try {
        const reviewPrompt = `Review this ${language} code for ${testFramework} testing gaps:\n\`\`\`\n${code.slice(0, 2000)}\n\`\`\``;
        const routeResult = smartRoute(reviewPrompt, { taskHint: 'coding' });
        const { text, model: usedModel } = await cascadeCollect(
          routeResult.waterfall,
          [
            { role: 'system', content: 'You are a code reviewer. Identify potential bugs, edge cases, and missing test coverage. Be concise.' },
            { role: 'user',   content: reviewPrompt },
          ],
          { temperature: 0.2, maxTokens: 512 },
        );
        aiReview = text ? `[${usedModel.displayName}] ${text}` : null;
      } catch { /* non-fatal */ }
    }

    const issues: string[] = [];
    if (todos > 0)      issues.push(`${todos} TODO comment(s) found`);
    if (consoles > 2)   issues.push(`${consoles} console.log calls (remove before production)`);
    if (anyTypes > 0)   issues.push(`${anyTypes} \`any\` type(s) found — add proper types`);

    return NextResponse.json({
      success: true,
      framework: testFramework,
      language,
      staticAnalysis: {
        lines,
        functions,
        issues,
        issueCount: issues.length,
        passed: issues.length === 0,
      },
      aiReview: aiReview ?? 'No AI provider configured for code review',
      results: {
        passed: issues.length === 0 ? 1 : 0,
        failed: issues.length > 0 ? issues.length : 0,
        total: Math.max(1, issues.length),
        message: issues.length === 0
          ? '✅ Static analysis passed — no obvious issues'
          : `⚠️ ${issues.length} issue(s) found: ${issues.join('; ')}`,
      },
      note: 'For full test execution, connect a sandboxed runner. This performs static analysis + AI code review.',
    });
  } catch (error: any) {
    console.error('[testing/run] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to run analysis', detail: error.message }, { status: 500 });
  }
}
