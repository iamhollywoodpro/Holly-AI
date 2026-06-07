/**
 * POST/GET /api/self-code — Phase 9D: HOLLY Self-Code Awareness
 *
 * Endpoints:
 *   GET  /api/self-code               → architecture summary + key files list
 *   POST /api/self-code/inspect       → HOLLY reads and explains a specific file
 *   POST /api/self-code/ask           → ask HOLLY a question about her own code
 *   POST /api/self-code/propose       → HOLLY proposes a self-improvement
 *   POST /api/self-code/approve       → CREATOR ONLY: approve and apply a proposal
 *
 * All self-modifications require CREATOR APPROVAL (Steve Hollywood Dorego).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  scanCodebase,
  inspectFile,
  askAboutCode,
  proposeImprovement,
  applyProposal,
  getArchitectureSummary,
  CREATOR_USER_ID,
  type ProposalType,
} from '@/lib/self-code/holly-self-awareness';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Auth helper: accept Clerk auth OR internal x-internal-token ──────────────

function resolveAuth(req: NextRequest, clerkUserId: string | null, body?: Record<string, unknown>): { userId: string | null; isInternal: boolean } {
  const internalToken = req.headers.get('x-internal-token');
  const secret = process.env.INTERNAL_API_SECRET;
  const isInternal = !!(secret && internalToken && internalToken === secret);
  // Internal calls may pass userId in the body; Clerk calls use the session
  // For GET/readonly calls, internal token alone is sufficient (userId defaults to 'internal')
  const userId = clerkUserId || (isInternal && body?.userId ? String(body.userId) : null) || (isInternal ? 'internal' : null);
  return { userId, isInternal };
}

// ─── GET: architecture overview ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    const { userId } = resolveAuth(req, clerkUserId);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [summary, files] = await Promise.all([
      getArchitectureSummary(),
      scanCodebase(150),
    ]);

    const byLanguage: Record<string, number> = {};
    for (const f of files) {
      byLanguage[f.language] = (byLanguage[f.language] ?? 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      phase: '9D',
      description: "HOLLY's Self-Code Awareness — she knows her own architecture",
      summary,
      stats: {
        totalFiles: files.length,
        totalLines: files.reduce((s, f) => s + f.lines, 0),
        byLanguage,
      },
      keyFiles: files
        .filter(f => ['TypeScript', 'TypeScript/React', 'Prisma'].includes(f.language))
        .slice(0, 30)
        .map(f => ({ path: f.path, language: f.language, lines: f.lines })),
      creatorGate: `Only ${CREATOR_USER_ID} can approve self-modifications`,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── POST: various self-code actions ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    const body   = await req.json();
    const { userId, isInternal } = resolveAuth(req, clerkUserId, body);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = body.action as string;

    switch (action) {

      // ── inspect: HOLLY reads a specific file ─────────────────────────────────
      case 'inspect': {
        const filePath = body.filePath as string;
        if (!filePath) {
          return NextResponse.json({ error: 'filePath required' }, { status: 400 });
        }
        const result = await inspectFile(filePath);
        return NextResponse.json({ ok: true, result });
      }

      // ── ask: Q&A about HOLLY's own code ──────────────────────────────────────
      case 'ask': {
        const question  = body.question as string;
        const filePaths = body.filePaths as string[] | undefined;
        if (!question) {
          return NextResponse.json({ error: 'question required' }, { status: 400 });
        }
        const answer = await askAboutCode(question, filePaths);
        return NextResponse.json({ ok: true, answer });
      }

      // ── propose: HOLLY generates an improvement proposal ─────────────────────
      case 'propose': {
        const { filePath, type, description } = body;
        if (!filePath || !type || !description) {
          return NextResponse.json({ error: 'filePath, type, description required' }, { status: 400 });
        }
        const VALID_TYPES: ProposalType[] = ['bug_fix', 'refactor', 'feature', 'performance', 'security', 'documentation'];
        if (!VALID_TYPES.includes(type)) {
          return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
        }
        const proposal = await proposeImprovement(filePath, type as ProposalType, description, userId);
        return NextResponse.json({
          ok: true,
          proposal,
          message: `Proposal created. Status: PENDING CREATOR APPROVAL. Only Steve Hollywood Dorego can approve this change.`,
        });
      }

      // ── approve: CREATOR ONLY — apply a proposal ─────────────────────────────
      case 'approve': {
        const { proposal, approved, creatorNote } = body;

        if (!proposal) {
          return NextResponse.json({ error: 'proposal object required' }, { status: 400 });
        }

        // Enforce creator-only gate — only Steve can approve self-modifications
        const envCreatorId = process.env.CREATOR_USER_ID;
        const isCreator = userId === CREATOR_USER_ID || (envCreatorId && userId === envCreatorId);
        if (!isCreator) {
          return NextResponse.json({ error: 'Forbidden: only the creator can approve self-code changes' }, { status: 403 });
        }

        const result = await applyProposal(proposal, {
          approved:   !!approved,
          creatorNote: creatorNote ?? '',
          reviewerId: userId,
        });

        return NextResponse.json({
          ok:      result.success,
          message: result.message,
          isCreator: true,
        });
      }

      default:
        return NextResponse.json({
          error: `Unknown action: ${action}`,
          validActions: ['inspect', 'ask', 'propose', 'approve'],
        }, { status: 400 });
    }

  } catch (err: unknown) {
    console.error('[Self-Code] Error:', err);
    return NextResponse.json(
      { error: 'Self-code operation failed', details: (err as Error).message },
      { status: 500 }
    );
  }
}
