/**
 * CODE MODIFICATION API
 * 
 * Enables Holly to modify existing code
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { codeGenerator } from '../../../../../lib/autonomous/code-generator';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { existingCode, modification, context } = body;

    if (!existingCode || !modification) {
      return NextResponse.json(
        { error: 'existingCode and modification are required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkUserId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[CodeModification] Modifying code:', modification);

    // Modify code
    const result = await codeGenerator.modifyCode(existingCode, modification, context);

    console.log('[CodeModification] Code modified, changes:', result.changes.length);

    // Record modification
    await prisma.hollyExperience.create({
      data: {
        userId: user.id,
        type: 'code_modification',
        content: {
          modification,
          changes: result.changes.length,
          reasoning: result.reasoning
        },
        significance: 0.7,
        lessons: [`Modified code: ${modification}`],
        relatedConcepts: ['self-coding', 'code-modification'],
        futureImplications: result.changes.map(c => c.description),
        emotionalImpact: 0.6,
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      modified_code: result.modified,
      changes: result.changes,
      reasoning: result.reasoning
    });
  } catch (error) {
    console.error('[CodeModification] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Code modification failed' },
      { status: 500 }
    );
  }
}
