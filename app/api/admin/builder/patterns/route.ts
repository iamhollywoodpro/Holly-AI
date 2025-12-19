import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

// ============================================================================
// PHASE 5A: CODE PATTERNS API
// Purpose: Learn and manage code patterns from existing codebase
// Endpoint: /api/admin/builder/patterns
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    // LIST: Get all patterns
    if (action === 'list') {
      const patternType = searchParams.get('patternType');
      const language = searchParams.get('language');
      const domain = searchParams.get('domain');
      const minConfidence = parseFloat(searchParams.get('minConfidence') || '0');

      const where: any = { userId };
      if (patternType) where.patternType = patternType;
      if (language) where.language = language;
      if (domain) where.domain = domain;
      if (minConfidence > 0) {
        where.confidence = { gte: minConfidence };
      }

      const patterns = await prisma.codePattern.findMany({
        where,
        orderBy: [
          { confidence: 'desc' },
          { occurrenceCount: 'desc' },
          { lastSeen: 'desc' },
        ],
      });

      return NextResponse.json({ patterns });
    }

    // GET: Get specific pattern
    if (action === 'get') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
      }

      const pattern = await prisma.codePattern.findUnique({
        where: { id },
      });

      if (!pattern || pattern.userId !== userId) {
        return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
      }

      return NextResponse.json({ pattern });
    }

    // STATS: Get pattern statistics
    if (action === 'stats') {
      const [total, byType, byLanguage, topPatterns] = await Promise.all([
        prisma.codePattern.count({ where: { userId } }),
        prisma.codePattern.groupBy({
          by: ['patternType'],
          where: { userId },
          _count: true,
          _avg: { confidence: true },
        }),
        prisma.codePattern.groupBy({
          by: ['language'],
          where: { userId },
          _count: true,
        }),
        prisma.codePattern.findMany({
          where: { userId },
          orderBy: [
            { confidence: 'desc' },
            { timesApplied: 'desc' },
          ],
          take: 10,
          select: {
            id: true,
            name: true,
            patternType: true,
            confidence: true,
            timesApplied: true,
            occurrenceCount: true,
          },
        }),
      ]);

      return NextResponse.json({
        stats: {
          total,
          byType,
          byLanguage,
          topPatterns,
        },
      });
    }

    // SUGGEST: Suggest patterns for a given context
    if (action === 'suggest') {
      const language = searchParams.get('language');
      const domain = searchParams.get('domain');
      const patternType = searchParams.get('patternType');

      const where: any = {
        userId,
        confidence: { gte: 0.7 }, // Only suggest high-confidence patterns
      };
      if (language) where.language = language;
      if (domain) where.domain = domain;
      if (patternType) where.patternType = patternType;

      const suggestions = await prisma.codePattern.findMany({
        where,
        orderBy: { confidence: 'desc' },
        take: 5,
      });

      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Code Patterns API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // CREATE: Create new pattern
    if (!action || action === 'create') {
      const {
        name,
        description,
        patternType,
        language,
        pattern,
        antiPattern,
        examples,
        framework,
        domain,
        confidence,
        learnedFrom,
      } = body;

      // Validation
      if (!name || !description || !patternType || !language || !pattern) {
        return NextResponse.json(
          { error: 'Name, description, pattern type, language, and pattern are required' },
          { status: 400 }
        );
      }

      const codePattern = await prisma.codePattern.create({
        data: {
          userId,
          name,
          description,
          patternType,
          language,
          pattern,
          antiPattern,
          examples: examples || [],
          framework,
          domain,
          confidence: confidence || 0.5,
          occurrenceCount: 1,
          learnedFrom: learnedFrom || {},
          timesApplied: 0,
        },
      });

      return NextResponse.json({ success: true, pattern: codePattern });
    }

    // APPLY: Mark pattern as applied
    if (action === 'apply') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Pattern ID required' }, { status: 400 });
      }

      const pattern = await prisma.codePattern.findUnique({
        where: { id },
      });

      if (!pattern || pattern.userId !== userId) {
        return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
      }

      // Update pattern usage
      const updatedPattern = await prisma.codePattern.update({
        where: { id },
        data: {
          timesApplied: { increment: 1 },
          lastSeen: new Date(),
          // Increase confidence slightly when applied successfully
          confidence: Math.min(pattern.confidence + 0.05, 1.0),
        },
      });

      return NextResponse.json({ success: true, pattern: updatedPattern });
    }

    // LEARN: Learn pattern from existing code
    if (action === 'learn') {
      const {
        sourceFile,
        codeSnippet,
        patternType,
        language,
      } = body;

      if (!codeSnippet || !patternType || !language) {
        return NextResponse.json(
          { error: 'Code snippet, pattern type, and language are required' },
          { status: 400 }
        );
      }

      // Check if similar pattern already exists
      const existingPattern = await prisma.codePattern.findFirst({
        where: {
          userId,
          language,
          patternType,
          // Simple similarity check (in production, use more sophisticated matching)
        },
      });

      if (existingPattern) {
        // Update existing pattern
        const updated = await prisma.codePattern.update({
          where: { id: existingPattern.id },
          data: {
            occurrenceCount: { increment: 1 },
            lastSeen: new Date(),
            confidence: Math.min(existingPattern.confidence + 0.1, 1.0),
            learnedFrom: {
              ...(existingPattern.learnedFrom as any),
              [sourceFile || 'unknown']: new Date().toISOString(),
            },
          },
        });

        return NextResponse.json({
          success: true,
          pattern: updated,
          message: 'Updated existing pattern',
        });
      }

      // Create new pattern
      const newPattern = await prisma.codePattern.create({
        data: {
          userId,
          name: `${patternType} pattern in ${language}`,
          description: `Learned from ${sourceFile || 'code analysis'}`,
          patternType,
          language,
          pattern: codeSnippet,
          examples: [{ source: sourceFile, code: codeSnippet }],
          confidence: 0.5, // Start with medium confidence
          occurrenceCount: 1,
          learnedFrom: {
            [sourceFile || 'unknown']: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: true,
        pattern: newPattern,
        message: 'Created new pattern',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Code Patterns API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Verify ownership
    const pattern = await prisma.codePattern.findUnique({
      where: { id },
    });

    if (!pattern || pattern.userId !== userId) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }

    // Update pattern
    const updatedPattern = await prisma.codePattern.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, pattern: updatedPattern });
  } catch (error) {
    console.error('Code Patterns API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Verify ownership
    const pattern = await prisma.codePattern.findUnique({
      where: { id },
    });

    if (!pattern || pattern.userId !== userId) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }

    // Delete the pattern
    await prisma.codePattern.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Code Patterns API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
