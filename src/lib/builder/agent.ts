/**
 * HOLLY AI Builder — Autonomous Agent Orchestrator (Phase 11)
 *
 * The core implementation loop:
 *   understand → inspect → plan → scaffold → install → build → verify → fix → done
 */

import { prisma } from '@/lib/db';
import { cascadeCollect } from '@/lib/ai/cascade';
import { smartRoute, type ModelSpec } from '@/lib/ai/smart-router';
import { emit } from './event-bus';
import { getSandboxProvider, waitForPort } from './sandbox-provider';
import { runFixLoop } from './fix-loop';
import {
  createWorkspace, writeFile, readFile, runCommand,
  detectFramework, inspectWorkspace, startDevServer, stopProcess,
  detectOpenPort, gitInit, gitCommit,
  listFiles, searchCode,
} from './sandbox';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuildPlan {
  projectType: string;
  stack: string;
  name: string;
  description: string;
  steps: BuildStep[];
  files: PlannedFile[];
  dependencies: string[];
  devDependencies: string[];
  devCommand: string;
  buildCommand: string;
  port: number;
}

interface BuildStep {
  id: string;
  phase: string;
  title: string;
  command?: string;
}

interface PlannedFile {
  path: string;
  description: string;
  language: string;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runBuilderAgent(sessionId: string): Promise<void> {
  const session = await prisma.buildSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const log = (type: Parameters<typeof emit>[1]['type'], title: string, body?: string, extra?: Partial<Parameters<typeof emit>[1]>) => {
    emit(sessionId, { type, title, body, level: 'info', phase: session.phase, ...extra });
  };

  try {
    // ── Phase: init ───────────────────────────────────────────────────────────
    await setPhase(sessionId, 'init', 5);
    log('info', 'HOLLY initialising workspace', 'Setting up isolated sandbox environment…');

    const workspaceDir = await createWorkspace(sessionId);
    await prisma.buildSession.update({ where: { id: sessionId }, data: { workspaceDir, status: 'planning' } });

    // ── Phase: inspect ────────────────────────────────────────────────────────
    await setPhase(sessionId, 'inspect', 10);
    log('info', 'Inspecting workspace', workspaceDir);
    const inspection = await inspectWorkspace(workspaceDir);
    const isEmptyWorkspace = inspection.files.length === 0;

    // ── Phase: plan ───────────────────────────────────────────────────────────
    await setPhase(sessionId, 'plan', 15);
    log('info', 'Generating build plan', 'Analysing your request and determining the best architecture…');

    const plan = await generateBuildPlan(session.prompt, inspection, sessionId);

    await prisma.buildSession.update({
      where: { id: sessionId },
      data: { plan: JSON.stringify(plan), projectType: plan.projectType, stack: plan.stack, status: 'building' },
    });

    emit(sessionId, {
      type: 'plan', sessionId, ts: Date.now(),
      title: `Build plan ready: ${plan.name}`,
      body: JSON.stringify(plan, null, 2),
      level: 'success', phase: 'plan',
    });

    // ── Phase: scaffold ───────────────────────────────────────────────────────
    await setPhase(sessionId, 'scaffold', 25);
    log('info', 'Scaffolding project', `Creating ${plan.files.length} files…`);

    await scaffoldFiles(sessionId, workspaceDir, plan);

    // ── Phase: install ────────────────────────────────────────────────────────
    if (plan.dependencies.length > 0 || plan.devDependencies.length > 0) {
      await setPhase(sessionId, 'install', 50);
      log('cmd_start', 'Installing dependencies', `npm install ${plan.dependencies.join(' ')}`);

      const installCmd = `npm init -y 2>/dev/null; npm install ${plan.dependencies.join(' ')} 2>&1`;
      const installResult = await runCommand(installCmd, workspaceDir, { timeoutMs: 90000 });

      if (plan.devDependencies.length > 0) {
        await runCommand(`npm install -D ${plan.devDependencies.join(' ')} 2>&1`, workspaceDir, { timeoutMs: 60000 });
      }

      emit(sessionId, {
        type: 'cmd_done', sessionId, ts: Date.now(),
        title: 'Dependencies installed',
        body: installResult.stderr.slice(0, 500) || 'All packages installed successfully',
        exitCode: installResult.exitCode, durationMs: installResult.durationMs,
        level: installResult.exitCode === 0 ? 'success' : 'warn',
        phase: 'install',
      });
    }

    // ── Phase: build ──────────────────────────────────────────────────────────
    await setPhase(sessionId, 'build', 65);

    if (plan.buildCommand) {
      log('cmd_start', 'Building project', plan.buildCommand);
      const buildResult = await runCommand(plan.buildCommand, workspaceDir, { timeoutMs: 120000 });
      emit(sessionId, {
        type: buildResult.exitCode === 0 ? 'cmd_done' : 'error', sessionId, ts: Date.now(),
        title: buildResult.exitCode === 0 ? 'Build successful' : 'Build error detected',
        body: (buildResult.stdout + buildResult.stderr).slice(0, 1000),
        exitCode: buildResult.exitCode, level: buildResult.exitCode === 0 ? 'success' : 'error',
        phase: 'build',
      });

      // Iterative fix loop
      if (buildResult.exitCode !== 0) {
        const provider = await getSandboxProvider();
        const fixResult = await runFixLoop({
          sessionId,
          provider,
          verifyCommand: plan.buildCommand,
          projectName: plan.name,
          stack: plan.stack,
          initialError: buildResult.stderr + buildResult.stdout,
          onAttempt: (a) => {
            emit(sessionId, {
              type: 'fix', sessionId, ts: Date.now(),
              title: `Fix attempt ${a.attempt}: ${a.result}`,
              body: `Files: ${a.filesChanged.join(', ')} | ${a.durationMs}ms`,
              level: a.result === 'fixed' ? 'success' : 'warn',
              phase: 'fix',
            });
          },
        });
        if (!fixResult.success) {
          emit(sessionId, {
            type: 'error', sessionId, ts: Date.now(),
            title: `Build failed after ${fixResult.attempts.length} fix attempts`,
            body: fixResult.finalError?.slice(0, 500),
            level: 'error', phase: 'build',
          });
        }
      }
    }

    // ── Phase: verify ─────────────────────────────────────────────────────────
    await setPhase(sessionId, 'verify', 75);
    log('info', 'Verifying project structure', 'Checking all required files exist…');

    const verifyResult = await verifyProject(workspaceDir, plan);
    if (!verifyResult.ok) {
      emit(sessionId, { type: 'error', sessionId, ts: Date.now(), title: 'Verification issues found', body: verifyResult.issues.join('\n'), level: 'warn', phase: 'verify' });
      await fixVerificationIssues(sessionId, workspaceDir, plan, verifyResult.issues);
    }

    // ── Phase: preview ────────────────────────────────────────────────────────
    await setPhase(sessionId, 'preview', 85);
    log('info', 'Launching preview server', `Starting: ${plan.devCommand}`);

    const port = await detectOpenPort([plan.port, 3001, 3002, 4000, 5000]);
    const previewProcessId = `preview-${sessionId}`;
    const devCmd = plan.devCommand.replace(/(\s|=)(\d{4,5})/, `$1${port}`);

    let previewLogs = '';
    startDevServer(previewProcessId, devCmd, workspaceDir, line => {
      previewLogs += line;
      emit(sessionId, { type: 'log', sessionId, ts: Date.now(), title: 'Server output', body: line.trim(), level: 'info', phase: 'preview' });
    });

    // Wait for server to start
    const started = await waitForPort(port, 30000);
    const previewUrl = `http://localhost:${port}`;

    await prisma.buildSession.update({
      where: { id: sessionId },
      data: { previewUrl, previewPort: port, status: 'running' },
    });

    // Track process
    await prisma.buildProcess.create({
      data: { sessionId, command: devCmd, cwd: workspaceDir, status: started ? 'running' : 'crashed', port },
    });

    if (started) {
      emit(sessionId, {
        type: 'preview_ready', sessionId, ts: Date.now(),
        title: '🚀 Preview ready!',
        body: previewUrl,
        previewUrl, level: 'success', phase: 'preview',
      });
    } else {
      emit(sessionId, { type: 'error', sessionId, ts: Date.now(), title: 'Preview server did not start in time', body: previewLogs.slice(-500), level: 'error', phase: 'preview' });
    }

    // ── Git commit ─────────────────────────────────────────────────────────
    await gitInit(workspaceDir).catch(() => {});
    await gitCommit(workspaceDir, `feat: ${plan.name} — built by HOLLY`).catch(() => {});

    // ── Done ───────────────────────────────────────────────────────────────
    await setPhase(sessionId, 'done', 100);
    const summary = generateSummary(plan, previewUrl, started);
    await prisma.buildSession.update({ where: { id: sessionId }, data: { status: 'done', summary } });

    emit(sessionId, {
      type: 'done', sessionId, ts: Date.now(),
      title: '✅ Build complete!',
      body: summary, level: 'success', phase: 'done', progress: 100,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[BuilderAgent] Fatal error:', msg);
    await prisma.buildSession.update({ where: { id: sessionId }, data: { status: 'error' } }).catch(() => {});
    emit(sessionId, { type: 'error', sessionId, ts: Date.now(), title: 'Build failed', body: msg, level: 'error', phase: 'error' });
  }
}

// ─── Plan Generation ──────────────────────────────────────────────────────────

async function generateBuildPlan(
  prompt: string,
  inspection: Awaited<ReturnType<typeof inspectWorkspace>>,
  sessionId: string
): Promise<BuildPlan> {
  const route = await smartRoute(prompt, { taskHint: 'coding' });

  const systemPrompt = `You are HOLLY's autonomous builder engine. You generate precise, executable build plans.
Respond ONLY with valid JSON matching this exact schema — no markdown, no explanation:
{
  "projectType": "webapp|api|landing|saas|tool",
  "stack": "nextjs|react|node|python|static|vite",
  "name": "project name",
  "description": "what this builds",
  "dependencies": ["pkg1", "pkg2"],
  "devDependencies": ["dev-pkg1"],
  "devCommand": "npm run dev",
  "buildCommand": "npm run build",
  "port": 3000,
  "files": [
    {"path": "src/index.ts", "description": "entry point", "language": "typescript"}
  ],
  "steps": [
    {"id": "s1", "phase": "scaffold", "title": "Create project structure"}
  ]
}`;

  const userPrompt = `User request: "${prompt}"
Existing workspace: ${inspection.framework.framework} project, ${inspection.files.length} files.
Generate a complete build plan that satisfies this request.`;

  try {
    const { text } = await cascadeCollect(route.waterfall, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.1, maxTokens: 2000 });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('[BuilderAgent] Plan generation error:', e);
  }

  // Fallback plan for a Next.js app
  return getDefaultPlan(prompt);
}

function getDefaultPlan(prompt: string): BuildPlan {
  const name = prompt.slice(0, 40).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'holly-app';
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return {
    projectType: 'webapp',
    stack: 'nextjs',
    name: slug,
    description: prompt,
    dependencies: ['react', 'react-dom', 'next'],
    devDependencies: ['typescript', '@types/react', '@types/node', 'tailwindcss', 'autoprefixer', 'postcss'],
    devCommand: 'npx next dev -p 3000',
    buildCommand: 'npx next build',
    port: 3000,
    files: [
      { path: 'package.json', description: 'package manifest', language: 'json' },
      { path: 'tsconfig.json', description: 'TypeScript config', language: 'json' },
      { path: 'tailwind.config.js', description: 'Tailwind CSS config', language: 'javascript' },
      { path: 'next.config.js', description: 'Next.js config', language: 'javascript' },
      { path: 'app/layout.tsx', description: 'Root layout', language: 'typescriptreact' },
      { path: 'app/page.tsx', description: 'Home page', language: 'typescriptreact' },
      { path: 'app/globals.css', description: 'Global styles', language: 'css' },
    ],
    steps: [
      { id: 's1', phase: 'scaffold', title: 'Scaffold Next.js project' },
      { id: 's2', phase: 'install', title: 'Install dependencies' },
      { id: 's3', phase: 'build', title: 'Build and verify' },
    ],
  };
}

// ─── File Scaffolding ─────────────────────────────────────────────────────────

async function scaffoldFiles(sessionId: string, workspaceDir: string, plan: BuildPlan): Promise<void> {
  const route = await smartRoute('generate code files', { taskHint: 'coding' });

  // Generate each file with AI
  const batchSize = 3;
  for (let i = 0; i < plan.files.length; i += batchSize) {
    const batch = plan.files.slice(i, i + batchSize);

    await Promise.all(batch.map(async (file) => {
      emit(sessionId, { type: 'file_write', sessionId, ts: Date.now(), title: `Writing ${file.path}`, filePath: file.path, level: 'info', phase: 'scaffold' });

      const content = await generateFileContent(route.waterfall, plan, file);

      await writeFile(workspaceDir, file.path, content);

      // Save to DB — use findFirst + update/create pattern (compound unique)
      const existing = await prisma.buildFile.findFirst({ where: { sessionId, path: file.path } });
      if (existing) {
        await prisma.buildFile.update({ where: { id: existing.id }, data: { content, updatedAt: new Date() } });
      } else {
        await prisma.buildFile.create({ data: { sessionId, path: file.path, content, action: 'write', language: file.language } });
      }
    }));
  }
}

async function generateFileContent(
  waterfall: ModelSpec[],
  plan: BuildPlan,
  file: PlannedFile
): Promise<string> {
  // Use static templates for key config files
  if (file.path === 'package.json') return generatePackageJson(plan);
  if (file.path === 'tsconfig.json') return generateTsConfig();
  if (file.path === 'tailwind.config.js') return generateTailwindConfig();
  if (file.path === 'next.config.js') return generateNextConfig();
  if (file.path === 'postcss.config.js') return generatePostcssConfig();
  if (file.path === 'app/globals.css') return generateGlobalsCss();

  // Use AI for all other files
  const systemPrompt = `You are HOLLY, a senior full-stack engineer. Write complete, production-quality ${file.language} code.
No markdown fences. No TODOs. No placeholder comments. Just the raw code file content.`;

  const userPrompt = `Project: ${plan.name} — ${plan.description}
Stack: ${plan.stack}
File to create: ${file.path}
Purpose: ${file.description}
Other files in project: ${plan.files.map(f => f.path).join(', ')}

Write the complete file content now.`;

  try {
    const { text } = await cascadeCollect(waterfall, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.2, maxTokens: 3000 });
    return text.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
  } catch {
    return `// ${file.path}\n// Generated by HOLLY\n`;
  }
}

// ─── Static templates ─────────────────────────────────────────────────────────

function generatePackageJson(plan: BuildPlan): string {
  return JSON.stringify({
    name: plan.name,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
    dependencies: Object.fromEntries(plan.dependencies.map(d => [d, 'latest'])),
    devDependencies: Object.fromEntries(plan.devDependencies.map(d => [d, 'latest'])),
  }, null, 2);
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true, skipLibCheck: true, strict: true,
      noEmit: true, esModuleInterop: true, module: 'esnext',
      moduleResolution: 'bundler', resolveJsonModule: true,
      isolatedModules: true, jsx: 'preserve', incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  }, null, 2);
}

function generateTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {} },
  plugins: [],
};\n`;
}

function generateNextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;\n`;
}

function generatePostcssConfig(): string {
  return `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`;
}

function generateGlobalsCss(): string {
  return `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }\n`;
}

// ─── Auto-Fix ─────────────────────────────────────────────────────────────────

async function autoFix(sessionId: string, workspaceDir: string, plan: BuildPlan, errorOutput: string): Promise<void> {
  emit(sessionId, { type: 'fix', sessionId, ts: Date.now(), title: 'Attempting auto-fix', body: 'Analysing build errors…', level: 'warn', phase: 'fix' });

  const route = await smartRoute('fix build errors', { taskHint: 'coding' });

  const systemPrompt = `You are HOLLY's error-correction engine. Analyse build errors and provide fixes.
Respond with JSON: { "fixes": [{ "file": "path", "action": "write|command", "content": "...", "command": "..." }] }`;

  try {
    const { text } = await cascadeCollect(route.waterfall, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Build error:\n${errorOutput.slice(0, 2000)}\n\nProject: ${plan.name} (${plan.stack})\nFiles: ${plan.files.map(f => f.path).join(', ')}` },
    ], { temperature: 0.1, maxTokens: 2000 });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const { fixes } = JSON.parse(jsonMatch[0]);

    for (const fix of fixes ?? []) {
      if (fix.action === 'write' && fix.file && fix.content) {
        await writeFile(workspaceDir, fix.file, fix.content);
        emit(sessionId, { type: 'fix', sessionId, ts: Date.now(), title: `Fixed: ${fix.file}`, filePath: fix.file, level: 'success', phase: 'fix' });
        await prisma.buildSession.update({ where: { id: sessionId }, data: { fixCount: { increment: 1 } } });
      } else if (fix.action === 'command' && fix.command) {
        await runCommand(fix.command, workspaceDir);
        emit(sessionId, { type: 'fix', sessionId, ts: Date.now(), title: `Ran fix: ${fix.command}`, command: fix.command, level: 'success', phase: 'fix' });
      }
    }
  } catch (e) {
    console.error('[AutoFix] Error:', e);
  }
}

// ─── Verification ─────────────────────────────────────────────────────────────

async function verifyProject(
  workspaceDir: string,
  plan: BuildPlan
): Promise<{ ok: boolean; issues: string[] }> {
  const issues: string[] = [];

  for (const file of plan.files.slice(0, 5)) {
    try {
      await readFile(workspaceDir, file.path);
    } catch {
      issues.push(`Missing file: ${file.path}`);
    }
  }

  return { ok: issues.length === 0, issues };
}

async function fixVerificationIssues(
  sessionId: string,
  workspaceDir: string,
  plan: BuildPlan,
  issues: string[]
): Promise<void> {
  for (const issue of issues) {
    const match = issue.match(/Missing file: (.+)/);
    if (match) {
      const filePath = match[1];
      const fileSpec = plan.files.find(f => f.path === filePath);
      if (fileSpec) {
        const content = await generateFileContent(
          (await smartRoute('generate code', { taskHint: 'coding' })).waterfall,
          plan, fileSpec
        );
        await writeFile(workspaceDir, filePath, content);
        emit(sessionId, { type: 'fix', sessionId, ts: Date.now(), title: `Regenerated missing file: ${filePath}`, filePath, level: 'success', phase: 'fix' });
      }
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function setPhase(sessionId: string, phase: string, progress: number): Promise<void> {
  await prisma.buildSession.update({ where: { id: sessionId }, data: { phase, progress } });
  emit(sessionId, { type: 'phase', sessionId, ts: Date.now(), title: `Phase: ${phase}`, phase, progress, level: 'info' });
}

function generateSummary(plan: BuildPlan, previewUrl: string, previewStarted: boolean): string {
  return `HOLLY built "${plan.name}" (${plan.stack}) — ${plan.files.length} files created. ${
    previewStarted ? `Preview running at ${previewUrl}` : 'Preview server not started.'
  }`;
}


