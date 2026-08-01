/**
 * HOLLY Code Action Proposal + Approval API — Phase 4.3 / 4.4
 *
 * Two-step flow:
 * 1. POST /api/code-actions/propose — Holly proposes a change (creates pending proposal)
 * 2. POST /api/code-actions/approve — Creator approves/rejects (applies via CreatorGate)
 *
 * This is the confirmation gate: Holly never writes code without explicit
 * approval. She proposes, Steve approves, then it's applied + validated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  inspectFile,
  applyProposal,
  type SelfModificationProposal,
} from '@/lib/self-code/holly-self-awareness';
import { logger } from '@/lib/logging/structured-logger';

// ─── POST /api/code-actions/propose ──────────────────────────────────────────
// Holly (or any authorized user) proposes a code change. Returns a preview
// of what would change. Does NOT write to disk.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, filePath, proposedCode, description, targetLine } = body;

    if (!action || !filePath) {
      return NextResponse.json(
        { error: 'action and filePath are required' },
        { status: 400 },
      );
    }

    // ── INSPECT: Read the current file so we can show a diff ──
    if (action === 'inspect') {
      const result = await inspectFile(filePath);
      return NextResponse.json({
        action: 'inspect',
        filePath,
        currentContent: result.content?.substring(0, 8000),
        summary: result.summary,
      });
    }

    // ── PROPOSE: Create a proposal (not applied yet) ──
    if (action === 'propose') {
      if (!proposedCode) {
        return NextResponse.json(
          { error: 'proposedCode is required for propose action' },
          { status: 400 },
        );
      }

      // Read current content for diff preview
      let currentContent = '';
      try {
        const result = await inspectFile(filePath);
        currentContent = result.content || '';
      } catch {
        // New file — currentContent stays empty
      }

      const proposal = {
        filePath,
        proposedCode,
        description: description || 'Holly proposed change',
        targetLine: targetLine || null,
        status: 'pending' as const,
        createdAt: new Date(),
      };

      return NextResponse.json({
        action: 'proposed',
        proposal,
        currentContent: currentContent.substring(0, 4000),
        proposedPreview: proposedCode.substring(0, 4000),
        message: 'Proposal created. Awaiting creator approval to apply.',
        requiresApproval: true,
      });
    }

    // ── APPROVE/REJECT: Apply the proposal (CreatorGate enforced) ──
    if (action === 'approve' || action === 'reject') {
      // Auth: only admin/creator can approve
      const adminResult = await requireAdmin();
      // requireAdmin returns NextResponse (error) or AdminAuthResult (success)
      if (adminResult instanceof NextResponse) {
        return adminResult; // already a 403/401 response
      }

      const { filePath: approvePath, proposedCode: approveCode, description: approveDesc, creatorNote } = body;
      if (!approvePath || !approveCode) {
        return NextResponse.json(
          { error: 'filePath and proposedCode required for approval' },
          { status: 400 },
        );
      }

      const proposal = {
        filePath: approvePath,
        proposedCode: approveCode,
        description: approveDesc || 'Approved change',
        targetLine: null,
        status: 'pending' as const,
        createdAt: new Date(),
      } as unknown as SelfModificationProposal;

      const decision = {
        approved: action === 'approve',
        creatorNote: creatorNote || (action === 'approve' ? 'Approved' : 'Rejected'),
        reviewerId: adminResult.userId,
      };

      const result = await applyProposal(proposal, decision);
      logger.info('CodeActions', `Proposal ${action}`, {
        filePath: approvePath,
        approved: decision.approved,
        success: result.success,
      });

      return NextResponse.json({
        action,
        success: result.success,
        message: result.message,
        filePath: approvePath,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Use inspect, propose, approve, or reject.` },
      { status: 400 },
    );
  } catch (err) {
    logger.error('CodeActions', 'Proposal error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: 'Internal error', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

// ─── GET /api/code-actions/propose ───────────────────────────────────────────
// Inspect a file (read-only, no auth required for Holly's own use)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('file');

    if (!filePath) {
      return NextResponse.json(
        { error: 'file parameter required' },
        { status: 400 },
      );
    }

    const result = await inspectFile(filePath);
    return NextResponse.json({
      filePath,
      content: result.content?.substring(0, 8000),
      summary: result.summary,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not read file', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
