import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

// ── Real AI code generation via smart router ──────────────────────────────────
async function generateCodeWithAI(
  prompt: string,
  language: string,
  purpose?: string,
  context?: any,
): Promise<{ code: string; modelUsed: string }> {
  const langGuide: Record<string, string> = {
    typescript: 'TypeScript with proper types, interfaces, and exports. Use modern TS patterns.',
    javascript: 'Modern ES2022+ JavaScript with JSDoc comments. Use ES modules.',
    python:     'Python 3.10+ with type hints, docstrings, and PEP 8 style.',
    css:        'Modern CSS with custom properties and responsive design.',
    html:       'Semantic HTML5 with accessibility attributes.',
    sql:        'Standard SQL with clear table aliases and comments.',
    bash:       'Bash with set -euo pipefail and inline comments.',
    go:         'Go with proper error handling and godoc comments.',
    rust:       'Idiomatic Rust with proper error handling.',
  };
  const langNote = langGuide[language.toLowerCase()] ?? `${language} following best practices`;

  const contextNote = context ? `\n\nAdditional context: ${JSON.stringify(context).slice(0, 500)}` : '';

  const systemPrompt = `You are HOLLY's code generation engine — a senior engineer that writes production-quality code.
Always write complete, working code. Never use TODO placeholders. Never leave stub functions.
Respond ONLY with the raw code — no markdown fences, no explanation, no preamble.`;

  const userPrompt = `Language: ${language}
Purpose: ${purpose ?? prompt}
Guidelines: ${langNote}${contextNote}

Requirement:
${prompt}`;

  // Route to 'coding' task — CF Kimi K2.5 → NVIDIA Qwen3-235B → OpenRouter Qwen Coder → Groq DeepSeek
  const routeResult = smartRoute(userPrompt, { taskHint: 'coding' });
  console.log(`[Builder Generate] Routing via ${routeResult.taskType}: ${routeResult.reason}`);

  const { text: code, model: usedModel } = await cascadeCollect(
    routeResult.waterfall,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    { temperature: 0.2, maxTokens: 4096 },
  );

  const trimmed = (code || '').trim();
  if (!trimmed) throw new Error('AI returned empty code');
  return { code: trimmed, modelUsed: usedModel.displayName };
}

export const runtime = 'nodejs';



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

      // Generate code using smart router (coding task: CF Kimi → NVIDIA Qwen3 → Groq DeepSeek)
      let generatedCodeText = '';
      let aiError: string | null = null;
      let modelUsed: string | null = null;
      try {
        const result = await generateCodeWithAI(prompt, language, purpose, contextUsed);
        generatedCodeText = result.code;
        modelUsed = result.modelUsed;
      } catch (err: any) {
        console.warn('[Builder/Generate] AI unavailable, using structured fallback:', err.message);
        aiError = err.message;
        // Structured fallback — at least provides a real starting point
        const commentChar = ['python', 'bash', 'shell'].includes(language) ? '#' : '//';
        generatedCodeText = `${commentChar} ${language} — ${purpose ?? prompt}\n${commentChar} Note: AI generation unavailable (${err.message}). Configure an AI provider key for real code generation.\n`;
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
          securityScore: aiError ? 50 : 80,
          testsPass: null,
          lintErrors: lintErrors.length > 0 ? lintErrors : aiError ? [aiError] : null,
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
          codeQualityScore: aiError ? 50 : 85,
          successRate: aiError ? 0 : 100,
        },
      });

      return NextResponse.json({
        success: true,
        generatedCode,
        job,
        aiGenerated: !aiError,
        model: aiError ? null : modelUsed,
        aiError: aiError ?? undefined,
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
