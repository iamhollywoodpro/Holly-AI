/**
 * HOLLY GitHub Repository API Route
 * 
 * Endpoint for GitHub repository operations.
 * 
 * @route POST /api/github/repo
 * @route GET /api/github/repo
 */

import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/integrations/github-client';

// ============================================================================
// Types
// ============================================================================

interface CreateRepoRequest {
  name: string;
  description?: string;
  private?: boolean;
  userId?: string;
}

// ============================================================================
// Initialize Services
// ============================================================================

const githubClient = new GitHubClient(
  process.env.GITHUB_PERSONAL_ACCESS_TOKEN || ''
);

// ============================================================================
// POST - Create Repository
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: CreateRepoRequest = await request.json();
    const { name, description, private: isPrivate, userId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      );
    }

    // Validate name format
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { error: 'Repository name can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }

    // Create repository
    const repo = await githubClient.createRepository({
      name,
      description: description || '',
      private: isPrivate !== undefined ? isPrivate : true,
      autoInit: true
    });

    return NextResponse.json(
      {
        success: true,
        repository: {
          name: repo.name,
          fullName: repo.full_name,
          url: repo.html_url,
          cloneUrl: repo.clone_url,
          private: repo.private,
          description: repo.description,
          createdAt: repo.created_at
        }
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('GitHub create repo API error:', error);
    
    // Handle specific GitHub errors
    if (error.status === 422) {
      return NextResponse.json(
        { error: 'Repository already exists or name is invalid' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to create repository',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - List Repositories
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const type = searchParams.get('type') || 'all';
    const sort = searchParams.get('sort') || 'updated';
    const perPage = parseInt(searchParams.get('perPage') || '30');

    let repos;

    if (owner) {
      // Get repos for specific owner
      repos = await githubClient.listUserRepositories(owner, {
        type: type as any,
        sort: sort as any,
        per_page: perPage
      });
    } else {
      // Get authenticated user's repos
      repos = await githubClient.listUserRepositories('', {
        type: type as any,
        sort: sort as any,
        per_page: perPage
      });
    }

    // Format response
    const formatted = repos.map((repo: any) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      private: repo.private,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      updatedAt: repo.updated_at
    }));

    return NextResponse.json(
      {
        success: true,
        repositories: formatted,
        count: formatted.length
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('GitHub list repos API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to list repositories',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete Repository
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 }
      );
    }

    await githubClient.deleteRepository(owner, repo);

    return NextResponse.json(
      {
        success: true,
        message: `Repository ${owner}/${repo} deleted successfully`
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('GitHub delete repo API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete repository',
        message: error.message
      },
      { status: 500 }
    );
  }
}
