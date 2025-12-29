/**
 * SELF-CODING API
 * 
 * Enables Holly to generate and modify her own code
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { codeGenerator, CodeGenerationRequest } from '../../../../../lib/autonomous/code-generator';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      task,
      context,
      language = 'typescript',
      framework,
      requirements,
      existingCode
    } = body;

    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkUserId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[SelfCoding] Generating code for task:', task);

    const request: CodeGenerationRequest = {
      task,
      context,
      language,
      framework,
      requirements,
      existingCode
    };

    // Generate code
    const result = await codeGenerator.generateCode(request);

    console.log('[SelfCoding] Code generated, confidence:', result.confidence);

    // Record generation
    await codeGenerator.recordGeneration(user.id, request, result);

    return NextResponse.json({
      success: true,
      code: result.code,
      explanation: result.explanation,
      tests: result.tests,
      dependencies: result.dependencies,
      warnings: result.warnings,
      confidence: result.confidence
    });
  } catch (error) {
    console.error('[SelfCoding] Code generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Code generation failed' },
      { status: 500 }
    );
  }
}
