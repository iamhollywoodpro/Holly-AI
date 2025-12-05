/**
 * Code Generation API
 * 
 * Generate new code, components, and features
 * 
 * Phase 5: Code Generation & Modification
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { codeGenerator, type CodeGenerationRequest } from '@/lib/code-generation/code-generator';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication (admin only)
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json() as CodeGenerationRequest;

    if (!body.type || !body.description) {
      return NextResponse.json(
        { error: 'type and description required' },
        { status: 400 }
      );
    }

    console.log(`[API:CODE-GEN] Generating ${body.type}: ${body.description}`);

    // Generate code
    const result = await codeGenerator.generateCode(body);

    return NextResponse.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:CODE-GEN] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
