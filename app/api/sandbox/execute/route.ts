/**
 * SANDBOX EXECUTE API
 * 
 * Safely executes code and returns results
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { sandboxExecutor } from '../../../../src/lib/sandbox/executor';
import { SandboxSecurity } from '../../../../src/lib/sandbox/security';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, language = 'javascript', timeout, memory_limit } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkUserId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check rate limit
    const rateLimit = await SandboxSecurity.checkRateLimit(user.id, 'execute');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          remaining: rateLimit.remaining,
          reset_at: rateLimit.reset_at
        },
        { status: 429 }
      );
    }

    // Get security policy
    const policy = SandboxSecurity.getPolicyForUser(user.id, false);

    // Validate code
    const validation = SandboxSecurity.validateCode(code, policy);
    if (!validation.valid) {
      // Log violations
      for (const violation of validation.violations) {
        await SandboxSecurity.logViolation(user.id, violation, code);
      }

      return NextResponse.json(
        {
          error: 'Security violation detected',
          violations: validation.violations
        },
        { status: 400 }
      );
    }

    console.log('[Sandbox] Executing code for user:', user.id);

    // Execute code
    const result = await sandboxExecutor.execute({
      code,
      language: language as any,
      timeout: timeout || policy.max_execution_time_ms,
      memoryLimit: memory_limit || policy.max_memory_mb
    });

    // Record execution
    await prisma.hollyExperience.create({
      data: {
        userId: user.id,
        type: 'code_execution',
        content: {
          language,
          success: result.success,
          execution_time_ms: result.execution_time_ms,
          has_output: !!result.output,
          has_error: !!result.error
        },
        significance: result.success ? 0.5 : 0.3,
        lessons: result.success
          ? ['Code executed successfully']
          : [`Code execution failed: ${result.error}`],
        relatedConcepts: ['code-execution', 'sandbox'],
        futureImplications: [],
        emotionalImpact: result.success ? 0.4 : -0.2,
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: result.success,
      output: result.output,
      error: result.error,
      console_logs: result.console_logs,
      execution_time_ms: result.execution_time_ms,
      preview_html: result.preview_html,
      rate_limit: {
        remaining: rateLimit.remaining - 1,
        reset_at: rateLimit.reset_at
      }
    });
  } catch (error) {
    console.error('[Sandbox] Execution error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Execution failed'
      },
      { status: 500 }
    );
  }
}
