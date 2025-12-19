import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

// ============================================================================
// PHASE 5A: CODE GENERATION ENGINE API
// Purpose: Core code generation, template processing, quality validation
// Endpoint: /api/admin/builder/generate
// ============================================================================

// Helper: Calculate code complexity (simple cyclomatic complexity estimate)
function calculateComplexity(code: string): number {
  const keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?'];
  let complexity = 1; // Base complexity
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = code.match(regex);
    if (matches) complexity += matches.length;
  });
  
  return Math.min(complexity, 100); // Cap at 100
}

// Helper: Basic linting check
function performBasicLinting(code: string, language: string): string[] {
  const errors: string[] = [];
  
  if (language === 'typescript' || language === 'javascript') {
    // Check for common issues
    if (!code.includes('export')) {
      errors.push('Warning: No exports found - code may not be reusable');
    }
    if (code.includes('console.log')) {
      errors.push('Warning: console.log statements found - consider using proper logging');
    }
    if (code.includes('any') && language === 'typescript') {
      errors.push('Warning: "any" type found - consider using specific types');
    }
  }
  
  if (language === 'python') {
    if (!code.includes('def ') && !code.includes('class ')) {
      errors.push('Warning: No functions or classes defined');
    }
  }
  
  return errors;
}

// Helper: Calculate lines of code (excluding empty lines and comments)
function countLinesOfCode(code: string): number {
  const lines = code.split('\n');
  let count = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.startsWith('/*')) {
      count++;
    }
  }
  
  return count;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    // LIST: Get all generated code
    if (action === 'list') {
      const status = searchParams.get('status');
      const language = searchParams.get('language');
      const approvalStatus = searchParams.get('approvalStatus');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      const where: any = { userId };
      if (status) where.status = status;
      if (language) where.language = language;
      if (approvalStatus) where.approvalStatus = approvalStatus;

      const [generatedCodes, total] = await Promise.all([
        prisma.generatedCode.findMany({
          where,
          include: {
            template: { select: { id: true, name: true } },
            codeGenJob: { select: { id: true, status: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.generatedCode.count({ where }),
      ]);

      return NextResponse.json({
        generatedCodes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // GET: Get specific generated code by ID
    if (action === 'get') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
      }

      const generatedCode = await prisma.generatedCode.findUnique({
        where: { id },
        include: {
          template: true,
          codeGenJob: true,
          previousVersion: true,
          nextVersions: true,
        },
      });

      if (!generatedCode || generatedCode.userId !== userId) {
        return NextResponse.json({ error: 'Code not found' }, { status: 404 });
      }

      return NextResponse.json({ generatedCode });
    }

    // STATS: Get generation statistics
    if (action === 'stats') {
      const [total, byLanguage, byStatus, recentCount] = await Promise.all([
        prisma.generatedCode.count({ where: { userId } }),
        prisma.generatedCode.groupBy({
          by: ['language'],
          where: { userId },
          _count: true,
        }),
        prisma.generatedCode.groupBy({
          by: ['status'],
          where: { userId },
          _count: true,
        }),
        prisma.generatedCode.count({
          where: {
            userId,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      return NextResponse.json({
        stats: {
          total,
          byLanguage,
          byStatus,
          recentCount,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Code Generation API Error:', error);
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

    // GENERATE: Create new code
    if (!action || action === 'generate') {
      const {
        prompt,
        language,
        templateId,
        filePath,
        purpose,
        description,
        contextUsed,
      } = body;

      // Validation
      if (!prompt || !language) {
        return NextResponse.json(
          { error: 'Prompt and language are required' },
          { status: 400 }
        );
      }

      // Create generation job first
      const job = await prisma.codeGenerationJob.create({
        data: {
          userId,
          jobType: 'synthesis',
          status: 'running',
          priority: 'medium',
          prompt,
          language,
          targetPath: filePath,
          input: { prompt, language, templateId, purpose },
          cognitiveContext: contextUsed,
          templateId,
        },
      });

      // Simulate code generation (In production, this would call an AI service)
      // For now, generate a simple placeholder based on language
      let generatedCodeText = '';
      
      if (language === 'typescript') {
        generatedCodeText = `// Generated TypeScript code
// Purpose: ${purpose || 'Generated code'}

export interface GeneratedInterface {
  id: string;
  name: string;
  createdAt: Date;
}

export function processData(data: GeneratedInterface): void {
  console.log('Processing:', data.name);
  // TODO: Implement logic based on: ${prompt}
}

export default processData;
`;
      } else if (language === 'python') {
        generatedCodeText = `# Generated Python code
# Purpose: ${purpose || 'Generated code'}

from typing import Dict, Any
from datetime import datetime

def process_data(data: Dict[str, Any]) -> None:
    """
    Process data based on requirements.
    
    Args:
        data: Input data dictionary
    """
    print(f"Processing: {data.get('name')}")
    # TODO: Implement logic based on: ${prompt}

if __name__ == "__main__":
    process_data({"name": "test"})
`;
      } else {
        generatedCodeText = `// Generated ${language} code
// Purpose: ${purpose || 'Generated code'}
// TODO: Implement logic based on: ${prompt}
`;
      }

      // Calculate metrics
      const linesOfCode = countLinesOfCode(generatedCodeText);
      const complexity = calculateComplexity(generatedCodeText);
      const lintErrors = performBasicLinting(generatedCodeText, language);

      // Create generated code record
      const generatedCode = await prisma.generatedCode.create({
        data: {
          userId,
          language,
          code: generatedCodeText,
          filePath: filePath || `generated/${language}/code_${Date.now()}.${language === 'python' ? 'py' : language === 'typescript' ? 'ts' : 'txt'}`,
          purpose: purpose || 'Generated code',
          description,
          prompt,
          templateId,
          contextUsed,
          status: 'draft',
          approvalStatus: 'pending',
          riskLevel: complexity > 20 ? 'high' : complexity > 10 ? 'medium' : 'low',
          linesOfCode,
          complexity,
          testCoverage: 0,
          securityScore: 75, // Default, would be calculated by security scanner
          testsPass: null,
          lintErrors: lintErrors.length > 0 ? lintErrors : null,
          codeGenJobId: job.id,
        },
        include: {
          template: true,
          codeGenJob: true,
        },
      });

      // Update job status
      await prisma.codeGenerationJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          output: {
            generatedCodeId: generatedCode.id,
            linesOfCode,
            complexity,
          },
          codeQualityScore: 75,
          successRate: 100,
        },
      });

      return NextResponse.json({
        success: true,
        generatedCode,
        job,
      });
    }

    // APPROVE: Approve generated code
    if (action === 'approve') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
      }

      const generatedCode = await prisma.generatedCode.update({
        where: { id },
        data: {
          approvalStatus: 'approved',
          status: 'approved',
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, generatedCode });
    }

    // REJECT: Reject generated code
    if (action === 'reject') {
      const { id, comments } = body;
      if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
      }

      const generatedCode = await prisma.generatedCode.update({
        where: { id },
        data: {
          approvalStatus: 'rejected',
          status: 'rejected',
          reviewComments: comments,
        },
      });

      return NextResponse.json({ success: true, generatedCode });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Code Generation API Error:', error);
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
    const generatedCode = await prisma.generatedCode.findUnique({
      where: { id },
    });

    if (!generatedCode || generatedCode.userId !== userId) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    // Delete the generated code
    await prisma.generatedCode.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Code Generation API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
