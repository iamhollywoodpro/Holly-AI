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

    const { filePath, content, message } = await req.json();

    if (!filePath || !content || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: filePath, content, message' },
        { status: 400 }
      );
    }

    // Check if file exists to get SHA
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: filePath,
      });
      if ('sha' in data) {
        sha = data.sha;
      }
    } catch (error: any) {
      // File doesn't exist, that's okay for create
      if (error.status !== 404) {
        throw error;
      }
    }

    // Create or update file
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      message,
      content: Buffer.from(content).toString('base64'),
      ...(sha && { sha }),
    });

    return NextResponse.json({
      success: true,
      path: filePath,
      sha: data.content?.sha,
      commit: data.commit.sha,
    });
  } catch (error: any) {
    console.error('Error writing file to GitHub:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to write file' },
      { status: 500 }
    );
  }
}
