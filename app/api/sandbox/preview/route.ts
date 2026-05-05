/**
 * SANDBOX PREVIEW API
 * 
 * Generates live preview for HTML/React code
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sandboxExecutor } from '../../../../src/lib/sandbox/executor';
import { SandboxSecurity } from '../../../../src/lib/sandbox/security';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, language = 'html' } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Validate code
    const validation = SandboxSecurity.validateCode(code);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Security violation detected',
          violations: validation.violations
        },
        { status: 400 }
      );
    }

    // Execute to generate preview
    const result = await sandboxExecutor.execute({
      code,
      language: language as any
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Preview generation failed'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      preview_html: result.preview_html
    });
  } catch (error) {
    console.error('[Sandbox] Preview error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Preview generation failed'
      },
      { status: 500 }
    );
  }
}
