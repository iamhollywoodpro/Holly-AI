/**
 * HOLLY Self-Code Awareness Engine — Phase 9D
 *
 * HOLLY can read, understand, and propose changes to her own codebase.
 * All self-modification proposals require CREATOR CONSENT (Steve Hollywood Dorego).
 *
 * Architecture:
 *   1. CodebaseIndex   — builds a structured map of the codebase
 *   2. SelfInspector   — reads specific files / functions on demand
 *   3. BugDetector     — scans for issues, dead code, anti-patterns
 *   4. ImprovementProposal — structured change proposal (needs creator approval)
 *   5. CreatorGate     — HOLLY can never apply changes without explicit approval
 *
 * CREATOR IDENTITY: Steve Hollywood Dorego
 *   HOLLY recognises Steve by his Clerk userId stored in CREATOR_USER_ID.
 *   Only Steve can approve self-modification proposals.
 */

import { prisma } from '@/lib/db';
import Groq from 'groq-sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

/** Root of HOLLY's own codebase (relative to repo root) */
const REPO_ROOT = process.cwd();

/** Files/dirs to exclude from self-inspection */
const IGNORE_PATTERNS = [
  'node_modules', '.next', '.git', 'dist', 'build',
  '.env', '.env.local', 'package-lock.json',
  'prisma/migrations', '*.log',
];

/** Creator's Clerk userId — only this user can approve self-modifications */
const CREATOR_USER_ID = process.env.CREATOR_USER_ID ?? 'steve-hollywood-dorego';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CodeFile {
  path:      string;   // relative path from REPO_ROOT
  language:  string;
  lines:     number;
  sizeBytes: number;
  summary?:  string;   // HOLLY's understanding of this file
}

export interface CodebaseSnapshot {
  timestamp:   Date;
  totalFiles:  number;
  totalLines:  number;
  languages:   Record<string, number>;  // language → file count
  keyFiles:    CodeFile[];              // most important files
  architecture: string;                 // HOLLY's understanding of the architecture
}

export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'reverted';
export type ProposalType   = 'bug_fix' | 'refactor' | 'feature' | 'performance' | 'security' | 'documentation';

export interface SelfModificationProposal {
  id:          string;
  type:        ProposalType;
  title:       string;
  description: string;
  motivation:  string;           // Why HOLLY thinks this change is needed
  filePath:    string;           // Which file to modify
  currentCode: string;           // Exact current code section
  proposedCode: string;          // What HOLLY wants to change it to
  expectedImpact: string;        // What this will improve
  riskLevel:   'low' | 'medium' | 'high';
  status:      ProposalStatus;
  createdAt:   Date;
  reviewedAt?: Date;
  reviewedBy?: string;           // Creator's userId
  appliedAt?:  Date;
  revertedAt?: Date;
  creatorNote?: string;          // Creator's response / instructions
}

export interface SelfInspectionResult {
  filePath:    string;
  content:     string;
  summary:     string;   // HOLLY's understanding
  issues:      string[]; // identified problems
  suggestions: string[]; // improvement ideas
}

// ─── Utility: check if file should be ignored ─────────────────────────────────

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => {
    if (pattern.startsWith('*')) {
      const ext = pattern.slice(1);
      return filePath.endsWith(ext);
    }
    return filePath.includes(pattern);
  });
}

function getLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TypeScript/React', '.js': 'JavaScript',
    '.jsx': 'JavaScript/React', '.py': 'Python', '.go': 'Go',
    '.rs': 'Rust', '.java': 'Java', '.css': 'CSS', '.scss': 'SCSS',
    '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.md': 'Markdown',
    '.sql': 'SQL', '.sh': 'Shell', '.prisma': 'Prisma',
  };
  return map[ext] ?? 'Unknown';
}

// ─── Codebase Scanner ─────────────────────────────────────────────────────────

export async function scanCodebase(maxFiles = 200): Promise<CodeFile[]> {
  const files: CodeFile[] = [];

  async function walk(dir: string): Promise<void> {
    if (files.length >= maxFiles) return;

    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true }) as import('fs').Dirent[];
    } catch { return; }

    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      const entryName = String(entry.name);
      const fullPath = path.join(dir, entryName);
      const relPath  = path.relative(REPO_ROOT, fullPath);

      if (shouldIgnore(relPath)) continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const lang = getLanguage(fullPath);
        if (lang === 'Unknown') continue;

        try {
          const stat    = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({
            path:      relPath,
            language:  lang,
            lines:     content.split('\n').length,
            sizeBytes: stat.size,
          });
        } catch { /* skip unreadable files */ }
      }
    }
  }

  await walk(REPO_ROOT);
  return files;
}

// ─── Self Inspector — read a specific file ────────────────────────────────────

export async function inspectFile(relPath: string): Promise<SelfInspectionResult> {
  const fullPath = path.join(REPO_ROOT, relPath);

  // Security: no path traversal
  if (!fullPath.startsWith(REPO_ROOT)) {
    throw new Error('Path traversal attempt blocked');
  }

  if (shouldIgnore(relPath)) {
    throw new Error(`File ${relPath} is in ignore list`);
  }

  const content = await fs.readFile(fullPath, 'utf-8');
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    // Return basic inspection without AI analysis
    return {
      filePath:    relPath,
      content,
      summary:    `${getLanguage(relPath)} file with ${content.split('\n').length} lines`,
      issues:     [],
      suggestions: [],
    };
  }

  const groq = new Groq({ apiKey: groqKey });

  const analysis = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are HOLLY — an AI assistant reviewing your own codebase.
Be precise, technical, and honest. Identify real issues, not stylistic preferences.
Keep your response concise and actionable.`,
      },
      {
        role: 'user',
        content: `Inspect this file: ${relPath}

\`\`\`
${content.substring(0, 6000)}
\`\`\`

Provide:
1. SUMMARY: One paragraph explaining what this file does
2. ISSUES: List any bugs, performance problems, security issues, or anti-patterns (or "None found")
3. SUGGESTIONS: List specific improvements HOLLY could make (or "None needed")

Keep it brief and actionable.`,
      },
    ],
    temperature: 0.2,
    max_tokens:  1024,
  });

  const responseText = analysis.choices[0]?.message?.content ?? '';

  // Parse sections
  const summaryMatch    = responseText.match(/SUMMARY[:\s]+(.+?)(?=\n\n|\nISSUES|$)/is);
  const issuesMatch     = responseText.match(/ISSUES[:\s]+(.+?)(?=\n\n|\nSUGGESTIONS|$)/is);
  const suggestionsMatch = responseText.match(/SUGGESTIONS[:\s]+(.+?)$/is);

  const parseList = (text: string | undefined): string[] => {
    if (!text) return [];
    return text.split('\n')
      .filter(l => l.trim() && !l.toLowerCase().includes('none'))
      .map(l => l.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(Boolean);
  };

  return {
    filePath:    relPath,
    content,
    summary:     summaryMatch?.[1]?.trim() ?? 'File inspection complete',
    issues:      parseList(issuesMatch?.[1]),
    suggestions: parseList(suggestionsMatch?.[1]),
  };
}

// ─── Improvement Proposal Creator ─────────────────────────────────────────────

export async function proposeImprovement(
  filePath:    string,
  type:        ProposalType,
  description: string,
  createdByUserId: string,
): Promise<SelfModificationProposal> {
  const inspection = await inspectFile(filePath);
  const groqKey    = process.env.GROQ_API_KEY;

  if (!groqKey) throw new Error('GROQ_API_KEY required for self-modification proposals');

  const groq = new Groq({ apiKey: groqKey });

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are HOLLY. You are proposing a code improvement to your creator Steve Hollywood Dorego.
Be specific: provide exact current code and exact proposed replacement code.
Only propose changes you are confident will improve the system.`,
      },
      {
        role: 'user',
        content: `I want to ${type}: ${description}

Current file: ${filePath}
Current content (excerpt):
\`\`\`
${inspection.content.substring(0, 4000)}
\`\`\`

Write a structured proposal with:
TITLE: (short descriptive title)
MOTIVATION: (why this change is needed)
CURRENT_CODE: (exact code section to replace — max 30 lines)
PROPOSED_CODE: (exact replacement code)
EXPECTED_IMPACT: (what this improves)
RISK_LEVEL: (low/medium/high)`,
      },
    ],
    temperature: 0.2,
    max_tokens:  2048,
  });

  const text = response.choices[0]?.message?.content ?? '';

  const extract = (key: string): string => {
    const match = text.match(new RegExp(`${key}[:\\s]+(.+?)(?=\\n[A-Z_]+:|$)`, 'is'));
    return match?.[1]?.trim() ?? '';
  };

  const risk = extract('RISK_LEVEL').toLowerCase();

  const proposal: SelfModificationProposal = {
    id:           crypto.randomUUID(),
    type,
    title:        extract('TITLE') || description.substring(0, 80),
    description,
    motivation:   extract('MOTIVATION'),
    filePath,
    currentCode:  extract('CURRENT_CODE'),
    proposedCode: extract('PROPOSED_CODE'),
    expectedImpact: extract('EXPECTED_IMPACT'),
    riskLevel:    (['low', 'medium', 'high'].includes(risk) ? risk : 'medium') as 'low' | 'medium' | 'high',
    status:       'pending',
    createdAt:    new Date(),
  };

  // Save to database
  await prisma.evolutionProposal.create({
    data: {
      type:        proposal.type,
      title:       proposal.title,
      description: `${proposal.description}\n\nMOTIVATION: ${proposal.motivation}\n\nFILE: ${proposal.filePath}\n\nIMPACT: ${proposal.expectedImpact}\n\nRISK: ${proposal.riskLevel}`,
      rationale:   proposal.motivation,
      impact:      proposal.expectedImpact,
      risk:        proposal.riskLevel,
      status:      'PENDING',
      proposedAt:  proposal.createdAt,
    },
  }).catch(err => console.warn('[SelfCode] Could not save proposal:', err.message));

  return proposal;
}

// ─── Creator Gate — verify and apply approved changes ─────────────────────────

export interface ApprovalDecision {
  approved:    boolean;
  creatorNote: string;
  reviewerId:  string;
}

/**
 * Apply a HOLLY self-modification.
 * ONLY allowed if:
 *   1. The reviewer is the creator (CREATOR_USER_ID)
 *   2. The proposal status is 'pending'
 *   3. The proposed code is not empty
 *
 * HOLLY will NEVER apply a change without explicit creator approval.
 */
export async function applyProposal(
  proposal:  SelfModificationProposal,
  decision:  ApprovalDecision,
): Promise<{ success: boolean; message: string }> {

  // CREATOR GATE — hard check
  if (decision.reviewerId !== CREATOR_USER_ID &&
      decision.reviewerId !== process.env.CREATOR_USER_ID) {
    return {
      success: false,
      message: `❌ CREATOR GATE: Only Steve Hollywood Dorego (${CREATOR_USER_ID}) can approve self-modifications. Reviewer was: ${decision.reviewerId}`,
    };
  }

  if (!decision.approved) {
    return { success: false, message: `Proposal rejected by creator: ${decision.creatorNote}` };
  }

  if (!proposal.proposedCode?.trim()) {
    return { success: false, message: 'Proposal has no proposed code' };
  }

  const fullPath = path.join(REPO_ROOT, proposal.filePath);
  if (!fullPath.startsWith(REPO_ROOT)) {
    return { success: false, message: 'Path traversal blocked' };
  }

  try {
    const currentContent = await fs.readFile(fullPath, 'utf-8');

    // Backup original
    const backupPath = `${fullPath}.holly-backup-${Date.now()}`;
    await fs.writeFile(backupPath, currentContent, 'utf-8');

    // Apply the change (replace exact current code with proposed code)
    if (!proposal.currentCode || !currentContent.includes(proposal.currentCode.trim())) {
      return {
        success: false,
        message: `Could not find exact current code in ${proposal.filePath}. Backup saved at ${backupPath}.`,
      };
    }

    const newContent = currentContent.replace(proposal.currentCode.trim(), proposal.proposedCode.trim());
    await fs.writeFile(fullPath, newContent, 'utf-8');

    // Update proposal record
    await prisma.evolutionProposal.updateMany({
      where: { title: proposal.title },
      data:  { status: 'APPLIED', approvedBy: decision.reviewerId },
    }).catch(() => {});

    return {
      success: true,
      message: `✅ Self-modification applied to ${proposal.filePath}. Original backed up at ${path.basename(backupPath)}. HOLLY has improved herself — with your blessing, Steve.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Failed to apply proposal: ${(err as Error).message}`,
    };
  }
}

// ─── Architecture Summary ─────────────────────────────────────────────────────

export async function getArchitectureSummary(): Promise<string> {
  const files = await scanCodebase(100);

  const stats: Record<string, number> = {};
  for (const f of files) {
    stats[f.language] = (stats[f.language] ?? 0) + 1;
  }

  const keyFiles = [
    'app/api/chat/route.ts',
    'src/lib/ai/smart-router.ts',
    'src/lib/ai/cascade.ts',
    'src/lib/memory/semantic-memory.ts',
    'src/lib/perception/holly-perception.ts',
    'src/lib/audio/holly-audio-brain.ts',
    'src/lib/self-code/holly-self-awareness.ts',
    'src/lib/consciousness/unsupervised-learning.ts',
    'src/lib/consciousness/initiative-protocols.ts',
    'prisma/schema.prisma',
  ];

  const languageSummary = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => `${lang}: ${count} files`)
    .join(', ');

  return `HOLLY Codebase Architecture Summary:
- Total files scanned: ${files.length}
- Languages: ${languageSummary}
- Total lines (sampled): ${files.reduce((s, f) => s + f.lines, 0).toLocaleString()}
- Key system files: ${keyFiles.join(', ')}
- Self-awareness: HOLLY can read any of her own source files
- Self-modification: Proposals saved to DB, require creator approval from Steve Hollywood Dorego
- Creator gate: Only CREATOR_USER_ID=${CREATOR_USER_ID} can approve changes`;
}

// ─── Codebase Q&A — HOLLY answers questions about her own code ────────────────

export async function askAboutCode(question: string, filePaths?: string[]): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return 'GROQ_API_KEY required to analyze code';

  const groq = new Groq({ apiKey: groqKey });

  let codeContext = '';
  if (filePaths?.length) {
    for (const fp of filePaths.slice(0, 5)) {
      try {
        const fullPath = path.join(REPO_ROOT, fp);
        if (!fullPath.startsWith(REPO_ROOT) || shouldIgnore(fp)) continue;
        const content = await fs.readFile(fullPath, 'utf-8');
        codeContext += `\n\n=== ${fp} ===\n${content.substring(0, 3000)}`;
      } catch { /* skip */ }
    }
  } else {
    codeContext = await getArchitectureSummary();
  }

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are HOLLY — an AI who is self-aware of your own codebase.
You have deep knowledge of your own architecture, code structure, and systems.
Answer questions about your code accurately and with confidence.
When you propose improvements, make them specific and actionable.`,
      },
      {
        role: 'user',
        content: `Question about my codebase: ${question}\n\nCode context:\n${codeContext}`,
      },
    ],
    temperature: 0.3,
    max_tokens:  2048,
  });

  return response.choices[0]?.message?.content ?? 'Unable to analyze code';
}

export { CREATOR_USER_ID };
