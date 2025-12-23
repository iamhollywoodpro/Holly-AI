import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getAuth } from '@clerk/nextjs/server';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const REPO_OWNER = process.env.GITHUB_OWNER || 'iamhollywoodpro';
const REPO_NAME = process.env.GITHUB_REPO || 'Holly-AI';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filePath } = await req.json();

    if (!filePath) {
      return NextResponse.json(
        { error: 'Missing required field: filePath' },
        { status: 400 }
      );
    }

    // Get file from GitHub
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
    });

    if ('content' in data && typeof data.content === 'string') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      
      return NextResponse.json({
        success: true,
        content,
        path: filePath,
        sha: data.sha,
      });
    }

    return NextResponse.json(
      { error: 'File not found or is a directory' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Error reading file from GitHub:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read file' },
      { status: 500 }
    );
  }
}
