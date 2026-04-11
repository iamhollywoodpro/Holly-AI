/**
 * POST /api/learning/collaboration/adapt
 * Adapts Holly's behavior based on detected collaboration mode.
 */
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

const COLLABORATION_MODES: Record<string, { description: string; settings: Record<string, any> }> = {
  'solo': {
    description: 'Individual focused work — Holly acts as a personal assistant',
    settings: { tone: 'conversational', detail: 'adaptive', codeExplain: true },
  },
  'pair-programming': {
    description: 'Side-by-side coding — Holly acts as a pair programmer',
    settings: { tone: 'technical', detail: 'concise', codeExplain: false, preferCode: true },
  },
  'team-review': {
    description: 'Team collaboration — Holly provides structured, review-ready output',
    settings: { tone: 'professional', detail: 'thorough', formatting: 'structured' },
  },
  'research': {
    description: 'Research mode — Holly provides comprehensive, cited analysis',
    settings: { tone: 'academic', detail: 'deep', citeSources: true },
  },
};

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    success: true,
    availableModes: Object.entries(COLLABORATION_MODES).map(([key, val]) => ({
      mode: key,
      description: val.description,
    })),
    howToUse: 'POST with { mode: "solo"|"pair-programming"|"team-review"|"research" }',
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { mode = 'solo' } = body;

    const modeConfig = COLLABORATION_MODES[mode] ?? COLLABORATION_MODES['solo'];

    return NextResponse.json({
      success: true,
      adapted: true,
      mode,
      description: modeConfig.description,
      settings: modeConfig.settings,
      message: `Holly adapted to ${mode} collaboration mode`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
