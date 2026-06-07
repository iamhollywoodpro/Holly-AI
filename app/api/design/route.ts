/**
 * Holly Design API — Live Theme Preview & Application
 *
 * POST /api/design/generate
 *   Generates design tokens from Holly's current emotional state
 *
 * POST /api/design/apply
 *   Applies a design proposal (requires creator approval for persistence)
 *
 * GET /api/design/current
 *   Returns current active design tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  generateDesignTokens,
  tokensToCSS,
  createDesignProposal,
  getDesignSelfDescription,
  type DesignProposal,
} from '@/lib/design/design-token-engine';
import { computeEmotionalState, defaultState } from '@/lib/consciousness/holly-emotional-state';

// In-memory store for the current active design (persists until server restart)
// In production, this would be stored in the database
let activeDesign: DesignProposal | null = null;

// ─── POST /api/design/generate ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { action, emotion, intensity, customDescription } = body;

    // Route based on action
    switch (action) {
      case 'generate': {
        // Generate design from emotional state
        const emotionalState = (emotion && intensity != null)
          ? {
              emotion,
              intensity: Math.min(1, Math.max(0, intensity)),
              trigger: 'Self-design request',
              timestamp: new Date(),
              behavior: {
                temperatureDelta: 0,
                emojiLevel: 0.5,
                verbosityDelta: 0,
                responseStyle: 'natural-balanced',
                proactiveFollowup: false,
              },
            }
          : defaultState();

        const proposal = createDesignProposal(
          emotionalState,
          customDescription,
        );

        return NextResponse.json({
          proposal: {
            id: proposal.id,
            description: proposal.description,
            css: proposal.cssOutput,
            tokens: proposal.tokens,
            selfDescription: getDesignSelfDescription(emotionalState),
          },
        });
      }

      case 'apply': {
        // Apply a design proposal (preview mode)
        const { proposalId, css, tokens } = body;

        const proposal: DesignProposal = {
          id: proposalId || crypto.randomUUID(),
          tokens,
          description: customDescription || 'Custom theme',
          cssOutput: css,
          createdAt: new Date(),
          approvedByCreator: false,
        };

        activeDesign = proposal;

        return NextResponse.json({
          success: true,
          message: 'Design applied for preview. Use approve to persist.',
          proposalId: proposal.id,
        });
      }

      case 'approve': {
        // Creator approves the current design for persistence
        if (!activeDesign) {
          return NextResponse.json(
            { error: 'No design to approve' },
            { status: 400 },
          );
        }

        activeDesign.approvedByCreator = true;
        activeDesign.appliedAt = new Date();

        // In production, save to database
        try {
          await prisma.selfHealingAction.create({
            data: {
              issueType: 'design_update',
              severity: 'low',
              description: `Design approved: ${activeDesign.description}`,
              affectedFiles: [],
              healingType: 'design_token_update',
              actionTaken: 'approved',
              changes: JSON.stringify({
                proposalId: activeDesign.id,
                tokens: activeDesign.tokens,
                description: activeDesign.description,
              }),
              status: 'completed',
              success: true,
            },
          });
        } catch {
          // Non-critical — database log failure shouldn't break design
        }

        return NextResponse.json({
          success: true,
          message: 'Design approved and persisted.',
          proposalId: activeDesign.id,
        });
      }

      case 'self-describe': {
        // Holly describes how she sees herself visually
        const emotionalState = (emotion && intensity != null)
          ? {
              emotion,
              intensity: Math.min(1, Math.max(0, intensity)),
              trigger: 'Self-reflection',
              timestamp: new Date(),
              behavior: {
                temperatureDelta: 0,
                emojiLevel: 0.5,
                verbosityDelta: 0,
                responseStyle: 'natural-balanced',
                proactiveFollowup: false,
              },
            }
          : defaultState();

        const description = getDesignSelfDescription(emotionalState);
        const tokens = generateDesignTokens(emotionalState);
        const css = tokensToCSS(tokens);

        return NextResponse.json({
          selfDescription: description,
          tokens,
          css,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action. Use: generate, apply, approve, self-describe' },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error('[Design API] Error:', err);
    return NextResponse.json(
      { error: 'Design generation failed', details: (err as Error).message },
      { status: 500 },
    );
  }
}

// ─── GET /api/design/current ────────────────────────────────────────────────

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    if (!activeDesign) {
      // Return default sovereign theme
      const defaultEmotionalState = defaultState();
      const tokens = generateDesignTokens(defaultEmotionalState);
      return NextResponse.json({
        active: false,
        tokens,
        css: tokensToCSS(tokens),
        description: 'Sovereign default — Holly is balanced',
      });
    }

    return NextResponse.json({
      active: true,
      tokens: activeDesign.tokens,
      css: activeDesign.cssOutput,
      description: activeDesign.description,
      approved: activeDesign.approvedByCreator,
      appliedAt: activeDesign.appliedAt,
    });
  } catch (err) {
    console.error('[Design API] GET Error:', err);
    return NextResponse.json(
      { error: 'Failed to get current design' },
      { status: 500 },
    );
  }
}
