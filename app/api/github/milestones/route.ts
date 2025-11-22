import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/milestones
 * List all milestones for a repository
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 * - state: open | closed | all (default: open)
 * - sort: due_on | completeness (default: due_on)
 * - direction: asc | desc (default: asc)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No GitHub token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const state = searchParams.get('state') || 'open';
    const sort = searchParams.get('sort') || 'due_on';
    const direction = searchParams.get('direction') || 'asc';

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    });

    // Fetch milestones
    const { data: milestones } = await octokit.rest.issues.listMilestones({
      owner,
      repo,
      state: state as 'open' | 'closed' | 'all',
      sort: sort as 'due_on' | 'completeness',
      direction: direction as 'asc' | 'desc',
      per_page: 100,
    });

    return NextResponse.json({
      milestones,
      total: milestones.length,
    });

  } catch (error: any) {
    console.error('Error fetching milestones:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch milestones',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
