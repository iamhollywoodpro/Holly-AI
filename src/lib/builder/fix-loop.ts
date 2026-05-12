/**
 * HOLLY AI Builder — Iterative Fix Loop Orchestrator
 *
 * Replaces the one-shot autoFix() with a real while loop:
 *   while (hasErrors && attempts < MAX && !stuck) {
 *     fingerprint error
 *     if duplicate fingerprint → stop (stuck)
 *     generate fix
 *     apply fixes
 *     re-run verification
 *   }
 *
 * Supports:
 *   - install failures (missing deps, peer conflicts)
 *   - build failures (TS errors, missing modules)
 *   - lint/type failures
 *   - preview startup failures
 *
 * Emits every attempt to the HOLLY event bus.
 * Stores attempt history in DB.
 */

import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { cascadeCollect } from '@/lib/ai/cascade';
import { smartRoute } from '@/lib/ai/smart-router';
import { emit } from './event-bus';
import type { SandboxProvider } from './sandbox-provider';

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_FIX_ATTEMPTS = parseInt(process.env.FIX_LOOP_MAX_ATTEMPTS ?? '5', 10);
const FIX_CONTEXT_CHARS = 3000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type FailureClass = 'install' | 'build' | 'lint' | 'type' | 'preview' | 'unknown';

export interface FixAttemptResult {
  attempt: number;
  fingerprint: string;
  failureClass: FailureClass;
  errorSummary: string;
  filesChanged: string[];
  commandsRun: string[];
  durationMs: number;
  result: 'fixed' | 'partial' | 'stuck' | 'max_reached' | 'no_change';
}

export interface FixLoopResult {
  success: boolean;
  attempts: FixAttemptResult[];
  finalError?: string;
  totalMs: number;
}

// ─── Error fingerprinting ─────────────────────────────────────────────────────

function fingerprintError(errorOutput: string): string {
  // Normalize: strip timestamps, hex addresses, line numbers
  const normalized = errorOutput
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.Z]+/g, '')
    .replace(/0x[0-9a-f]+/gi, '0xADDR')
    .replace(/:\d+:\d+/g, ':LINE:COL')
    .replace(/\s+/g, ' ')
    .slice(0, 500);
  return crypto.createHash('md5').update(normalized).digest('hex').slice(0, 12);
}

function classifyFailure(errorOutput: string): FailureClass {
  const lower = errorOutput.toLowerCase();
  if (lower.includes('npm err') && (lower.includes('peer dep') || lower.includes('npm install'))) return 'install';
  if (lower.includes('eslint') || lower.includes('tslint')) return 'lint';
  if (lower.includes('typescript') || lower.includes('ts error') || lower.includes('error ts')) return 'type';
  if (lower.includes('enoent') || lower.includes('module not found') || lower.includes('cannot find module')) return 'build';
  if (lower.includes('eaddrinuse') || lower.includes('port') || lower.includes('listen')) return 'preview';
  if (lower.includes('syntaxerror') || lower.includes('parseerror')) return 'build';
  return 'build';
}

// ─── Fix generator ────────────────────────────────────────────────────────────

interface GeneratedFix {
  files: Array<{ path: string; content: string }>;
  commands: string[];
  reasoning: string;
}

async function generateFix(
  sessionId: string,
  errorOutput: string,
  failureClass: FailureClass,
  projectName: string,
  stack: string,
  allFiles: string[],
  previousAttempts: FixAttemptResult[],
): Promise<GeneratedFix> {
  const route = await smartRoute('fix TypeScript build errors', { taskHint: 'coding' });

  const attemptContext = previousAttempts.length > 0
    ? `\nPrevious fix attempts (${previousAttempts.length}):\n${previousAttempts.map(a =>
      `  Attempt ${a.attempt}: ${a.result} — ${a.errorSummary.slice(0, 100)}`
    ).join('\n')}`
    : '';

  const systemPrompt = `You are HOLLY's error-correction engine. Analyse ${failureClass} errors and provide targeted fixes.
Respond ONLY with valid JSON (no markdown):
{
  "reasoning": "brief explanation of what caused the error and how to fix it",
  "files": [{"path": "relative/path.ts", "content": "COMPLETE file content — never truncate"}],
  "commands": ["npm install missing-pkg", "..."]
}
Rules:
- Only include files that need to change
- Never truncate file content
- Prefer minimal targeted fixes
- If installing a package, use --save or --save-dev appropriately
- Never suggest deleting node_modules unless specifically a corrupt install`;

  const userPrompt = `Project: ${projectName} (${stack})
Failure class: ${failureClass}
Files in project: ${allFiles.slice(0, 30).join(', ')}${attemptContext}

Error output:
${errorOutput.slice(0, FIX_CONTEXT_CHARS)}

Generate a fix.`;

  try {
    const { text } = await cascadeCollect(route.waterfall, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.05, maxTokens: 4000 });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedFix;
      return {
        files: Array.isArray(parsed.files) ? parsed.files : [],
        commands: Array.isArray(parsed.commands) ? parsed.commands : [],
        reasoning: parsed.reasoning ?? '',
      };
    }
  } catch (e) {
    console.error('[FixLoop] Fix generation error:', e);
  }

  // Minimal fallback
  return { files: [], commands: [], reasoning: 'Could not parse AI fix response' };
}

// ─── Main fix loop ─────────────────────────────────────────────────────────────

export async function runFixLoop(opts: {
  sessionId: string;
  provider: SandboxProvider;
  verifyCommand: string;
  projectName: string;
  stack: string;
  initialError: string;
  onAttempt?: (attempt: FixAttemptResult) => void;
}): Promise<FixLoopResult> {
  const { sessionId, provider, verifyCommand, projectName, stack, initialError } = opts;
  const startTotal = Date.now();
  const attempts: FixAttemptResult[] = [];
  const seenFingerprints = new Set<string>();
  let currentError = initialError;

  emit(sessionId, {
    type: 'fix',
    title: `🔄 Starting fix loop (max ${MAX_FIX_ATTEMPTS} attempts)`,
    body: `Failure class: ${classifyFailure(currentError)}`,
    level: 'warn',
    phase: 'fix',
  });

  for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
    const attemptStart = Date.now();
    const fingerprint = fingerprintError(currentError);
    const failureClass = classifyFailure(currentError);
    const errorSummary = currentError.slice(0, 200);

    emit(sessionId, {
      type: 'fix',
      title: `Fix attempt ${attempt}/${MAX_FIX_ATTEMPTS}`,
      body: `Fingerprint: ${fingerprint} | Class: ${failureClass}`,
      level: 'info',
      phase: 'fix',
      progress: Math.round(50 + (attempt / MAX_FIX_ATTEMPTS) * 30),
    });

    // Stuck detection
    if (seenFingerprints.has(fingerprint)) {
      emit(sessionId, {
        type: 'fix',
        title: '🛑 Fix loop stopped — same error repeating',
        body: `Fingerprint ${fingerprint} seen before. Stopping to avoid thrashing.`,
        level: 'warn',
        phase: 'fix',
      });
      const result: FixAttemptResult = {
        attempt, fingerprint, failureClass, errorSummary,
        filesChanged: [], commandsRun: [],
        durationMs: Date.now() - attemptStart,
        result: 'stuck',
      };
      attempts.push(result);
      opts.onAttempt?.(result);
      break;
    }
    seenFingerprints.add(fingerprint);

    // List current files
    const fileTree = await provider.listFiles(sessionId);
    const allFiles: string[] = [];
    const flatten = (nodes: typeof fileTree) => {
      for (const n of nodes) {
        if (n.isDirectory) flatten(n.children ?? []);
        else allFiles.push(n.path);
      }
    };
    flatten(fileTree);

    // Generate fix
    const fix = await generateFix(
      sessionId, currentError, failureClass,
      projectName, stack, allFiles, attempts
    );

    const filesChanged: string[] = [];
    const commandsRun: string[] = [];

    // Apply file fixes
    for (const f of fix.files) {
      if (!f.path || !f.content) continue;
      await provider.writeFile(sessionId, f.path, f.content);
      filesChanged.push(f.path);
      emit(sessionId, {
        type: 'fix',
        title: `  ✎ Applied fix to ${f.path}`,
        filePath: f.path, level: 'success', phase: 'fix',
      });
      // Persist to DB
      const existing = await prisma.buildFile.findFirst({ where: { sessionId, path: f.path } });
      if (existing) {
        await prisma.buildFile.update({ where: { id: existing.id }, data: { content: f.content, updatedAt: new Date() } });
      } else {
        await prisma.buildFile.create({ data: { sessionId, path: f.path, content: f.content, action: 'fix' } });
      }
    }

    // Run commands
    for (const cmd of fix.commands.slice(0, 5)) {
      if (!cmd) continue;
      commandsRun.push(cmd);
      emit(sessionId, { type: 'cmd_start', title: `  $ ${cmd}`, command: cmd, level: 'info', phase: 'fix' });
      const r = await provider.exec(sessionId, cmd, { timeoutMs: 90_000 });
      emit(sessionId, {
        type: 'cmd_done',
        title: r.exitCode === 0 ? `  ✓ ${cmd}` : `  ✗ ${cmd}`,
        body: (r.stdout + r.stderr).slice(0, 1000),
        exitCode: r.exitCode, command: cmd, level: r.exitCode === 0 ? 'success' : 'error', phase: 'fix',
      });
    }

    // No change guard
    if (filesChanged.length === 0 && commandsRun.length === 0) {
      emit(sessionId, { type: 'fix', title: '⚠ Fix generated no changes — stopping', level: 'warn', phase: 'fix' });
      const result: FixAttemptResult = {
        attempt, fingerprint, failureClass, errorSummary,
        filesChanged, commandsRun,
        durationMs: Date.now() - attemptStart,
        result: 'no_change',
      };
      attempts.push(result);
      opts.onAttempt?.(result);
      await persistAttempt(sessionId, result);
      break;
    }

    await prisma.buildSession.update({
      where: { id: sessionId },
      data: { fixCount: { increment: 1 } },
    }).catch(() => {});

    // Re-verify
    emit(sessionId, { type: 'info', title: `  ↻ Re-running ${verifyCommand}`, level: 'info', phase: 'fix' });
    const verify = await provider.exec(sessionId, verifyCommand, { timeoutMs: 120_000 });
    const verifyOk = verify.exitCode === 0;
    currentError = verify.stderr + verify.stdout;

    const result: FixAttemptResult = {
      attempt, fingerprint, failureClass, errorSummary,
      filesChanged, commandsRun,
      durationMs: Date.now() - attemptStart,
      result: verifyOk ? 'fixed' : (attempt === MAX_FIX_ATTEMPTS ? 'max_reached' : 'partial'),
    };
    attempts.push(result);
    opts.onAttempt?.(result);
    await persistAttempt(sessionId, result);

    if (verifyOk) {
      emit(sessionId, {
        type: 'fix',
        title: `✅ Fixed after ${attempt} attempt${attempt > 1 ? 's' : ''}`,
        body: fix.reasoning,
        level: 'success',
        phase: 'fix',
        progress: 80,
      });
      return { success: true, attempts, totalMs: Date.now() - startTotal };
    }

    emit(sessionId, {
      type: 'fix',
      title: `  Still failing after attempt ${attempt}`,
      body: currentError.slice(0, 200),
      level: 'warn',
      phase: 'fix',
    });
  }

  return {
    success: false,
    attempts,
    finalError: currentError.slice(0, 500),
    totalMs: Date.now() - startTotal,
  };
}

// ─── Persistence ───────────────────────────────────────────────────────────────

async function persistAttempt(sessionId: string, result: FixAttemptResult): Promise<void> {
  try {
    await prisma.buildEvent.create({
      data: {
        sessionId,
        type: 'fix',
        phase: 'fix',
        title: `Fix attempt ${result.attempt}: ${result.result}`,
        body: JSON.stringify({
          fingerprint: result.fingerprint,
          failureClass: result.failureClass,
          filesChanged: result.filesChanged,
          commandsRun: result.commandsRun,
          durationMs: result.durationMs,
          result: result.result,
        }),
        level: result.result === 'fixed' ? 'success' : result.result === 'stuck' ? 'error' : 'warn',
      },
    });
  } catch { /* non-critical */ }
}
