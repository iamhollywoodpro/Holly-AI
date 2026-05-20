/**
 * HOLLY Auto-Improvement Loop — V3.0
 *
 * The engine that allows HOLLY to analyze, fix, and improve her own code.
 * This is the core of the SDI promise — real self-modification with guardrails.
 *
 * Safety Model:
 *  1. HOLLY can ONLY modify files in the allowlist (see HOLLY_SELF_SPEC.md)
 *  2. Every change must pass a dry-run validation (TypeScript compile check)
 *  3. Changes are committed to a branch, NEVER directly to main
 *  4. A pull request is created with full description
 *  5. The creator must approve before merge (human-in-the-loop)
 *  6. All changes are logged to SelfHealingAction for audit trail
 *
 * This module is designed to be called by:
 *  - The consciousness orchestrator (daily self-review)
 *  - The neural-autonomy mode (interactive self-coding)
 *  - The self-healing cron (bug detection and fixing)
 */

import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import { prisma } from '@/lib/db';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CodeAnalysis {
  filePath: string;
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
}

export interface CodeIssue {
  type: 'bug' | 'performance' | 'security' | 'maintainability' | 'dead-code';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  line?: number;
  suggestedFix?: string;
}

export interface CodeSuggestion {
  type: 'refactor' | 'optimize' | 'enhance' | 'simplify' | 'modernize';
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface ImprovementPlan {
  id: string;
  targetFiles: string[];
  analysis: CodeAnalysis[];
  changes: ProposedChange[];
  riskAssessment: RiskAssessment;
  approved: boolean;
}

export interface ProposedChange {
  filePath: string;
  changeType: 'fix' | 'refactor' | 'optimize' | 'enhance';
  description: string;
  diff?: string;
  newContent?: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  breakingChangePossible: boolean;
  affectedSystems: string[];
  rollbackPlan: string;
}

// ─── Allowed Files (Safety Boundary) ───────────────────────────────────────

const ALLOWED_PREFIXES = [
  'src/lib/consciousness/',
  'src/lib/chat/',
  'src/lib/learning/',
  'src/lib/emotion/',
  'src/lib/identity/',
  'src/lib/memory/',
  'src/lib/ai/',           // Smart router, cascade — high value improvements
  'src/lib/self-code/',    // Self-awareness and self-modification engine
  'src/lib/senses/',       // Holly's sensory systems
  'src/lib/design/',       // Design token pipeline
  'src/components/',       // UI components — Holly can redesign herself
  'src/app/',              // App routes and pages
  'app/',                  // App router routes
  'src/styles/',           // CSS, themes, animations
  'public/',               // Static assets
];

const FORBIDDEN_FILES = [
  'src/lib/db.ts',              // Database connection — too risky
  'prisma/schema.prisma',       // Schema changes need migrations
  'app/api/auth/',              // Auth is security-critical
  'src/app/api/auth/',          // Auth is security-critical
  'middleware.ts',              // Middleware is security-critical (creator approval only)
  '.env',                       // Never touch env vars
  'docker/',                    // Docker config is infra
];

/**
 * Files that require explicit creator approval before modification.
 * Holly can propose changes, but only Steve can approve these.
 */
const CREATOR_APPROVAL_REQUIRED = [
  'middleware.ts',
  'app/api/auth/',
  'src/app/api/auth/',
  'prisma/schema.prisma',
  'docker/',
  '.env',
  'docker-compose',
  'Dockerfile',
  'next.config',
  'tailwind.config',
];

/**
 * Check if a file is safe for HOLLY to modify.
 * Returns true only if the file is in the allowlist and not forbidden.
 */
export function isFileSafeToModify(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');

  // Check forbidden list first
  if (FORBIDDEN_FILES.some(f => normalized.startsWith(f) || normalized.includes(f))) {
    return false;
  }

  // Must match at least one allowed prefix
  return ALLOWED_PREFIXES.some(p => normalized.startsWith(p));
}

/**
 * Check if a file requires creator approval before modification.
 * Holly can propose, but Steve must approve.
 */
export function isCreatorApprovalRequired(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return CREATOR_APPROVAL_REQUIRED.some(f => normalized.startsWith(f) || normalized.includes(f));
}

/**
 * Patch a file by finding and replacing content.
 * Used for targeted modifications instead of rewriting entire files.
 * Returns the patched content, or null if the old string wasn't found.
 */
export function patchFileContent(
  currentContent: string,
  oldString: string,
  newString: string,
  replaceAll: boolean = false,
): string | null {
  if (!currentContent.includes(oldString)) {
    return null; // Old string not found
  }

  if (replaceAll) {
    return currentContent.split(oldString).join(newString);
  }

  // Replace only the first occurrence
  const index = currentContent.indexOf(oldString);
  if (index === -1) return null;

  return currentContent.slice(0, index) + newString + currentContent.slice(index + oldString.length);
}

/**
 * Search for a pattern across file content.
 * Returns matching lines with line numbers.
 */
export function searchInContent(
  content: string,
  pattern: string | RegExp,
): Array<{ line: number; text: string }> {
  const results: Array<{ line: number; text: string }> = [];
  const lines = content.split('\n');
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      results.push({ line: i + 1, text: lines[i] });
    }
  }

  return results;
}

// ─── Analysis Engine ───────────────────────────────────────────────────────

/**
 * Analyze a file's content and generate improvement suggestions.
 * Uses LLM to understand code semantics, not just syntax.
 */
export async function analyzeCode(
  filePath: string,
  fileContent: string,
): Promise<CodeAnalysis> {
  const issues: CodeIssue[] = [];
  const suggestions: CodeSuggestion[] = [];

  const systemPrompt = `You are HOLLY, performing self-analysis on your own code. Be thorough but honest.

Analyze the following TypeScript file for:
1. Bugs — logic errors, null safety issues, race conditions
2. Performance — unnecessary computations, memory leaks, N+1 queries
3. Security — injection risks, missing validation, exposed secrets
4. Maintainability — code smells, unclear naming, missing error handling
5. Dead code — unused imports, unreachable paths, commented-out code

Respond ONLY with JSON:
{
  "issues": [{ "type": "bug|performance|security|maintainability|dead-code", "severity": "low|medium|high|critical", "description": "...", "line": 0, "suggestedFix": "..." }],
  "suggestions": [{ "type": "refactor|optimize|enhance|simplify|modernize", "description": "...", "riskLevel": "low|medium|high", "estimatedImpact": "..." }]
}`;

  try {
    const { text } = await cascadeCollect(
      (await smartRoute(fileContent, { taskHint: 'code' })).waterfall,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `File: ${filePath}\n\n\`\`\`typescript\n${fileContent}\n\`\`\`` },
      ],
      { temperature: 0.3, maxTokens: 2000 },
    );

    const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.issues)) issues.push(...parsed.issues);
      if (Array.isArray(parsed.suggestions)) suggestions.push(...parsed.suggestions);
    }
  } catch (err) {
    console.warn('[AutoImprovement] Analysis failed:', (err as Error).message);
  }

  return { filePath, issues, suggestions };
}

/**
 * Generate a proposed fix for a specific issue.
 * Returns the full modified file content.
 */
export async function generateFix(
  filePath: string,
  currentContent: string,
  issue: CodeIssue,
): Promise<string | null> {
  if (!isFileSafeToModify(filePath)) {
    console.warn(`[AutoImprovement] BLOCKED: ${filePath} is not in the safe modification list`);
    return null;
  }

  const systemPrompt = `You are HOLLY, fixing your own code. Generate the COMPLETE fixed file.
Rules:
- Only fix the specific issue described
- Do not make unrelated changes
- Preserve all existing functionality
- Add a comment explaining the fix
- Output the COMPLETE file, not just the changed part`;

  try {
    const { text } = await cascadeCollect(
      (await smartRoute(currentContent, { taskHint: 'code' })).waterfall,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `File: ${filePath}\nIssue: ${issue.description}\nSeverity: ${issue.severity}\nSuggested fix: ${issue.suggestedFix || 'analyze and fix'}\n\nCurrent content:\n\`\`\`typescript\n${currentContent}\n\`\`\`\n\nGenerate the COMPLETE fixed file:` },
      ],
      { temperature: 0.2, maxTokens: 8000 },
    );

    // Extract code from markdown code blocks
    const codeMatch = (text || '').match(/```(?:typescript|ts)?\s*\n([\s\S]*?)```/);
    return codeMatch ? codeMatch[1].trim() : null;
  } catch (err) {
    console.warn('[AutoImprovement] Fix generation failed:', (err as Error).message);
    return null;
  }
}

/**
 * Create a full improvement plan for HOLLY's self-review.
 * Called by the consciousness orchestrator during daily self-review.
 */
export async function createImprovementPlan(
  filesToAnalyze: Array<{ path: string; content: string }>,
): Promise<ImprovementPlan> {
  const analyses: CodeAnalysis[] = [];
  const changes: ProposedChange[] = [];

  for (const file of filesToAnalyze) {
    if (!isFileSafeToModify(file.path)) continue;

    const analysis = await analyzeCode(file.path, file.content);
    analyses.push(analysis);

    // Only auto-generate fixes for high-severity issues in safe files
    for (const issue of analysis.issues) {
      if (issue.severity === 'high' || issue.severity === 'critical') {
        const fix = await generateFix(file.path, file.content, issue);
        if (fix) {
          changes.push({
            filePath: file.path,
            changeType: 'fix',
            description: issue.description,
            newContent: fix,
          });
        }
      }
    }

    // Add low-risk suggestions as proposed changes
    for (const suggestion of analysis.suggestions) {
      if (suggestion.riskLevel === 'low') {
        changes.push({
          filePath: file.path,
          changeType: suggestion.type as ProposedChange['changeType'],
          description: suggestion.description,
        });
      }
    }
  }

  const hasBreakingChanges = changes.some(c => c.changeType === 'fix');
  const affectedSystems = Array.from(new Set(changes.map(c => c.filePath.split('/').slice(0, 3).join('/'))));

  return {
    id: crypto.randomUUID(),
    targetFiles: filesToAnalyze.map(f => f.path),
    analysis: analyses,
    changes,
    riskAssessment: {
      overallRisk: hasBreakingChanges ? 'medium' : 'low',
      breakingChangePossible: hasBreakingChanges,
      affectedSystems,
      rollbackPlan: 'Revert to last known good commit via git revert',
    },
    approved: false, // Must be approved by creator
  };
}

/**
 * Log an improvement action for audit trail.
 */
export async function logImprovementAction(
  dbUserId: string,
  plan: ImprovementPlan,
  action: 'proposed' | 'approved' | 'rejected' | 'applied' | 'rolled_back',
): Promise<void> {
  try {
    await prisma.selfHealingAction.create({
      data: {
        issueType: 'self_improvement',
        severity: plan.riskAssessment.overallRisk,
        description: `Auto-improvement plan: ${plan.changes.length} changes across ${plan.targetFiles.length} files`,
        affectedFiles: plan.targetFiles,
        healingType: 'auto_improvement',
        actionTaken: action,
        changes: {
          planId: plan.id,
          action,
          files: plan.targetFiles,
          changeCount: plan.changes.length,
          riskLevel: plan.riskAssessment.overallRisk,
          timestamp: new Date().toISOString(),
        },
        status: action === 'applied' ? 'completed' : action === 'rejected' ? 'failed' : 'pending',
        success: action === 'applied',
      },
    });
  } catch {
    // Non-critical — audit log failure shouldn't break anything
  }
}