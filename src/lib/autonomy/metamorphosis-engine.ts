import { logger } from '@/lib/monitoring/logger';
import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export interface DriftItem {
  spec: string;
  actual: string;
  severity: 'low' | 'medium' | 'high';
  file?: string;
  suggestedFix?: string;
}

export interface MetamorphosisResult {
  driftDetected: boolean;
  items: DriftItem[];
  fixGenerated: boolean;
  branchName: string | null;
  prUrl: string | null;
  prNumber: number | null;
  summary: string;
}

const V26_SPEC: Record<string, { expected: boolean; file?: string }> = {
  'anti_hallucination_protocol': { expected: true, file: 'src/lib/holly-modes.ts' },
  'sonauto_music_provider': { expected: true, file: 'src/lib/music/sonauto-provider.ts' },
  'hybrid_studio_mode': { expected: true, file: 'app/api/music/hybrid-studio/route.ts' },
  'ollama_gemma4_31b': { expected: true, file: 'src/lib/ai/smart-router.ts' },
  'ollama_qwen35_32b': { expected: true, file: 'src/lib/ai/smart-router.ts' },
  'ollama_deepseek_r1_14b': { expected: true, file: 'src/lib/ai/smart-router.ts' },
  'github_actions_ci': { expected: true, file: '.github/workflows/ci.yml' },
  'livekit_voice': { expected: true, file: 'app/api/voice/livekit/route.ts' },
  'pgvector_semantic_memory': { expected: true, file: 'src/lib/memory/semantic-memory.ts' },
  'daily_diagnostic_cron': { expected: true, file: 'docker/cron/crontab' },
  'mirror_protocol_tool': { expected: true, file: 'scripts/holly-mcp-server.js' },
  'morning_briefing': { expected: true, file: 'src/lib/autonomy/morning-briefing.ts' },
  'emotional_baseline': { expected: true, file: 'src/lib/autonomy/emotional-baseline.ts' },
  'sovereign_briefing_ui': { expected: true, file: 'src/components/holly2/SovereignBriefing.tsx' },
  'critical_push_webhook': { expected: true, file: 'app/api/notifications/critical-push/route.ts' },
  'metamorphosis_engine': { expected: true, file: 'src/lib/autonomy/metamorphosis-engine.ts' },
  'cross_domain_synthesis': { expected: true, file: 'src/lib/ai/smart-router.ts' },
};

async function detectDrift(): Promise<DriftItem[]> {
  const drift: DriftItem[] = [];
  const baseUrl = process.env.HOLLY_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    if (!healthRes.ok) return [{ spec: 'health_endpoint', actual: 'unreachable', severity: 'critical' as any }];
    const health = await healthRes.json();

    const activeProviders: string[] = Object.entries(health.providers || {})
      .filter(([, v]: [string, any]) => v)
      .map(([k]: [string, any]) => k);

    const activeIntegrations: string[] = Object.entries(health.integrations || {})
      .filter(([, v]: [string, any]) => v)
      .map(([k]: [string, any]) => k);

    if (!activeIntegrations.includes('suno')) {
      drift.push({ spec: 'suno_integration', actual: 'inactive', severity: 'high' });
    }
    if (!activeProviders.includes('ollama')) {
      drift.push({ spec: 'ollama_provider', actual: 'inactive', severity: 'medium' });
    }

    const crons = health.sovereignty?.autonomousCrons || [];
    const cronNames = crons.map((c: any) => c.name);
    if (!cronNames.includes('daily-diagnostic')) {
      drift.push({ spec: 'daily_diagnostic_cron', actual: 'missing', severity: 'medium', file: 'docker/cron/crontab' });
    }
  } catch (err: any) {
    drift.push({ spec: 'health_endpoint', actual: `error: ${err.message}`, severity: 'high' });
  }

  return drift;
}

async function generateFixCode(driftItems: DriftItem[]): Promise<{ branchName: string; fixes: Array<{ file: string; content: string }> } | null> {
  if (driftItems.length === 0) return null;

  const route = smartRoute('generate code fixes for config drift', { taskHint: 'coding' });

  const driftDescription = driftItems.map(d =>
    `- ${d.spec}: expected active, got ${d.actual}${d.file ? ` (file: ${d.file})` : ''}`
  ).join('\n');

  const systemPrompt = `You are HOLLY's Metamorphosis Engine — an autonomous self-repair system.
Given a list of config drift items (spec vs actual state), generate minimal code fixes.
Respond ONLY with valid JSON — no markdown, no explanation:
{
  "branchName": "auto-fix/drift-{timestamp}",
  "fixes": [
    { "file": "path/to/file", "content": "full file content or patch" }
  ]
}
If a drift item cannot be fixed via code (e.g. env var missing), omit it from fixes.`;

  try {
    const { text } = await cascadeCollect(route.waterfall, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Drift detected:\n${driftDescription}\n\nGenerate fixes. Current project is a Next.js 14 app with TypeScript.` },
    ], { temperature: 0.1, maxTokens: 2000 });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (err) {
    logger.error('[Metamorphosis] Fix generation failed', { category: 'metamorphosis', error: String(err) });
  }
  return null;
}

async function createPullRequest(
  branchName: string,
  fixes: Array<{ file: string; content: string }>,
  driftItems: DriftItem[],
): Promise<{ prUrl: string | null; prNumber: number | null }> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER || 'iamhollywoodpro';
  const repo = process.env.GITHUB_REPO_NAME || 'Holly-AI';

  if (!token) {
    logger.warn('[Metamorphosis] No GITHUB_TOKEN — cannot create PR', { category: 'metamorphosis' });
    return { prUrl: null, prNumber: null };
  }

  try {
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: token });

    const { data: mainRef } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    const mainSha = mainRef.object.sha;

    await octokit.git.createRef({
      owner, repo,
      ref: `refs/heads/${branchName}`,
      sha: mainSha,
    });

    for (const fix of fixes) {
      let existingSha: string | undefined;
      try {
        const { data: existingFile } = await octokit.repos.getContent({
          owner, repo, path: fix.file, ref: branchName,
        });
        if ('sha' in existingFile) existingSha = existingFile.sha;
      } catch {}

      await octokit.repos.createOrUpdateFileContents({
        owner, repo,
        path: fix.file,
        message: `fix(metamorphosis): auto-fix drift — ${fix.file}`,
        content: Buffer.from(fix.content).toString('base64'),
        branch: branchName,
        ...(existingSha ? { sha: existingSha } : {}),
      });
    }

    const driftSummary = driftItems.map(d => `- ${d.spec}: ${d.actual}`).join('\n');
    const { data: pr } = await octokit.pulls.create({
      owner, repo,
      title: `🤖 Metamorphosis: Auto-fix config drift (${driftItems.length} items)`,
      head: branchName,
      base: 'main',
      body: `## Metamorphosis Engine — Automated Drift Fix\n\nDetected config drift:\n${driftSummary}\n\n**Files changed:** ${fixes.map(f => f.file).join(', ')}\n\n---\n*This PR was auto-generated by HOLLY's Metamorphosis Engine. Review before merging.*`,
    });

    logger.info('[Metamorphosis] PR created', { category: 'metamorphosis', prUrl: pr.html_url });
    return { prUrl: pr.html_url, prNumber: pr.number };
  } catch (err) {
    logger.error('[Metamorphosis] PR creation failed', { category: 'metamorphosis', error: String(err) });
    return { prUrl: null, prNumber: null };
  }
}

export async function runMetamorphosisCycle(): Promise<MetamorphosisResult> {
  logger.info('[Metamorphosis] Starting cycle', { category: 'metamorphosis' });

  const driftItems = await detectDrift();

  if (driftItems.length === 0) {
    logger.info('[Metamorphosis] No drift detected', { category: 'metamorphosis' });
    return {
      driftDetected: false,
      items: [],
      fixGenerated: false,
      branchName: null,
      prUrl: null,
      prNumber: null,
      summary: 'All systems aligned — no config drift detected.',
    };
  }

  logger.info('[Metamorphosis] Drift detected', { category: 'metamorphosis', count: driftItems.length });

  const fixResult = await generateFixCode(driftItems);

  if (!fixResult || fixResult.fixes.length === 0) {
    return {
      driftDetected: true,
      items: driftItems,
      fixGenerated: false,
      branchName: null,
      prUrl: null,
      prNumber: null,
      summary: `Drift detected in ${driftItems.length} areas but no auto-fix could be generated. Manual review needed.`,
    };
  }

  const prResult = await createPullRequest(fixResult.branchName, fixResult.fixes, driftItems);

  return {
    driftDetected: true,
    items: driftItems,
    fixGenerated: true,
    branchName: fixResult.branchName,
    prUrl: prResult.prUrl,
    prNumber: prResult.prNumber,
    summary: `Auto-fixed ${fixResult.fixes.length} files for ${driftItems.length} drift items. ${prResult.prUrl ? `PR: ${prResult.prUrl}` : 'PR creation failed — manual push needed.'}`,
  };
}
