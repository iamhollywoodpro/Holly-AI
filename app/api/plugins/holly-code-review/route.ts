/**
 * Code Review Plugin API Routes
 *
 * POST /api/plugins/holly-code-review — Review code snippet
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { codeReviewService } from '@/lib/plugins/implementations/holly-code-review';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { message, code, language } = await req.json();

    // If full message provided, detect code blocks automatically
    if (message && !code) {
      const snippets = codeReviewService.detectCode(message);
      if (snippets.length === 0) {
        return NextResponse.json({ detected: false, message: 'No code blocks found in message.' });
      }

      // Review all detected snippets
      const reviews = await Promise.all(
        snippets.map(snippet => codeReviewService.reviewCode(snippet))
      );

      return NextResponse.json({
        detected: true,
        snippetCount: snippets.length,
        reviews: reviews.map((r, i) => ({
          ...r,
          language: snippets[i].language,
          formatted: codeReviewService.formatReviewResult(r),
        })),
      });
    }

    // Direct code review
    if (!code) {
      return NextResponse.json({ error: 'message or code required' }, { status: 400 });
    }

    const result = await codeReviewService.reviewCode({
      language: language || 'unknown',
      code,
    });

    return NextResponse.json({
      ...result,
      formatted: codeReviewService.formatReviewResult(result),
    });
  } catch (error) {
    console.error('[CodeReview] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
