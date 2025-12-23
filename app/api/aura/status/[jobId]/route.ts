import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { jobId } = params;

    // Fetch analysis from database
    const analysis = await prisma.auraAnalysis.findFirst({
      where: {
        jobId,
        userId: user.id,
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Calculate estimated time remaining (rough estimate)
    let estimatedTimeRemaining: number | undefined;
    if (analysis.status === 'processing') {
      const remainingProgress = 100 - analysis.progress;
      // Assume ~0.5 seconds per percentage point
      estimatedTimeRemaining = Math.floor(remainingProgress * 0.5);
    }

    return NextResponse.json({
      jobId: analysis.jobId,
      status: analysis.status,
      progress: analysis.progress,
      currentStep: getCurrentStep(analysis.progress),
      estimatedTimeRemaining,
    });

  } catch (error) {
    console.error('Error fetching analysis status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis status' },
      { status: 500 }
    );
  }
}

function getCurrentStep(progress: number): string | undefined {
  if (progress < 20) return 'Extracting audio features...';
  if (progress < 40) return 'Processing lyrics...';
  if (progress < 60) return 'Calculating hit factor...';
  if (progress < 80) return 'Finding similar tracks...';
  if (progress < 100) return 'Generating report...';
  return undefined;
}
