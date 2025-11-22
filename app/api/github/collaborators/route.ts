import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/collaborators
 * List all collaborators for a repository
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 * - affiliation: (optional) Filter by affiliation (all, direct, outside)
 * - permission: (optional) Filter by permission (pull, push, admin, maintain, triage)
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
    const affiliation = searchParams.get('affiliation') || 'all';
    const permission = searchParams.get('permission');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    });

    // Build request parameters
    const params: any = {
      owner,
      repo,
      affiliation,
      per_page: 100,
    };

    if (permission) {
      params.permission = permission;
    }

    // Fetch collaborators
    const { data: collaborators } = await octokit.rest.repos.listCollaborators(params);

    // Also fetch organization members if this is an org repo
    let orgMembers: any[] = [];
    try {
      const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
      if (repoData.organization) {
        const { data: members } = await octokit.rest.orgs.listMembers({
          org: owner,
          per_page: 100,
        });
        orgMembers = members;
      }
    } catch (error) {
      // Not an org repo or no access to org members
      console.log('Could not fetch org members:', error);
    }

    // Combine and deduplicate
    const allUsers = [...collaborators];
    orgMembers.forEach(member => {
      if (!allUsers.find(u => u.id === member.id)) {
        allUsers.push({
          ...member,
          permissions: { pull: true, push: false, admin: false },
        });
      }
    });

    return NextResponse.json({
      collaborators: allUsers,
      total: allUsers.length,
    });

  } catch (error: any) {
    console.error('Error fetching collaborators:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch collaborators',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
