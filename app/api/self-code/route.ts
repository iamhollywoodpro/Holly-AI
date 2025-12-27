import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  readFile,
  listFiles,
  writeFile,
  deleteFile,
  searchFiles,
  getRepoStructure,
  getRecentCommits,
  isGitHubConfigured,
} from '@/lib/github-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Self-Coding API
 * Allows HOLLY to read and modify her own code
 */
export async function POST(req: NextRequest) {
  try {
    // 1. AUTH - Only authenticated users can use self-coding
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. CHECK GITHUB CONFIGURATION
    if (!isGitHubConfigured()) {
      return NextResponse.json(
        { error: 'GitHub integration not configured' },
        { status: 500 }
      );
    }

    // 3. PARSE REQUEST
    const body = await req.json();
    const { action, filePath, content, commitMessage, query, dirPath, count } = body;

    console.log('[Self-Code API] Action:', action, 'File:', filePath || dirPath || query);

    // 4. EXECUTE ACTION
    switch (action) {
      case 'read':
        if (!filePath) {
          return NextResponse.json({ error: 'filePath required' }, { status: 400 });
        }
        const fileContent = await readFile(filePath);
        if (fileContent === null) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
        return NextResponse.json({ content: fileContent });

      case 'list':
        const files = await listFiles(dirPath || '');
        return NextResponse.json({ files });

      case 'write':
        if (!filePath || !content || !commitMessage) {
          return NextResponse.json(
            { error: 'filePath, content, and commitMessage required' },
            { status: 400 }
          );
        }
        const writeResult = await writeFile(filePath, content, commitMessage);
        if (!writeResult.success) {
          return NextResponse.json({ error: writeResult.error }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: 'File written successfully' });

      case 'delete':
        if (!filePath || !commitMessage) {
          return NextResponse.json(
            { error: 'filePath and commitMessage required' },
            { status: 400 }
          );
        }
        const deleteResult = await deleteFile(filePath, commitMessage);
        if (!deleteResult.success) {
          return NextResponse.json({ error: deleteResult.error }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: 'File deleted successfully' });

      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'query required' }, { status: 400 });
        }
        const searchResults = await searchFiles(query);
        return NextResponse.json({ results: searchResults });

      case 'structure':
        const structure = await getRepoStructure();
        return NextResponse.json({ structure });

      case 'commits':
        const commits = await getRecentCommits(count || 10);
        return NextResponse.json({ commits });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Self-Code API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
