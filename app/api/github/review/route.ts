import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Octokit } from '@octokit/rest';
import { reviewCode } from '@/lib/code-reviewer';
import type { GitHubFile } from '@/lib/github-api';

export const runtime = 'nodejs';


/**
 * POST /api/github/review
 * Perform AI-powered code review on files or PR
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - files: Array of files to review (path, content)
 * - pr_number: Optional PR number to review
 * - submit_review: Whether to submit review to GitHub (requires pr_number)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { owner, repo, files, pr_number, submit_review } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    // Get GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 403 }
      );
    }

    const octokit = new Octokit({
      auth: connection.accessToken,
    });

    let filesToReview: GitHubFile[] = [];

    // If PR number provided, fetch PR files
    if (pr_number) {
      const { data: prFiles } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pr_number,
      });

      // Fetch file contents
      for (const file of prFiles) {
        // Skip deleted files and binary files
        if (file.status === 'removed' || file.changes > 1000) {
          continue;
        }

        try {
          const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: file.sha,
          });

          if ('content' in data && data.content) {
            filesToReview.push({
              path: file.filename,
              content: Buffer.from(data.content, 'base64').toString('utf-8'),
            });
          }
        } catch (err) {
          console.error(`Failed to fetch ${file.filename}:`, err);
        }
      }
    } else if (files && Array.isArray(files)) {
      // Use provided files
      filesToReview = files;
    } else {
      return NextResponse.json(
        { error: 'Either files or pr_number must be provided' },
        { status: 400 }
      );
    }

    // Perform AI code review
    const reviewResult = await reviewCode(filesToReview);

    // If submit_review is true and pr_number provided, submit review to GitHub
    if (submit_review && pr_number) {
      const comments = reviewResult.issues
        .filter(issue => issue.line !== undefined)
        .map(issue => ({
          path: issue.file,
          line: issue.line!,
          body: `**${issue.title}** (${issue.severity})\n\n${issue.description}\n\n${
            issue.suggestion ? `**Suggestion:** ${issue.suggestion}` : ''
          }`,
        }));

      // Create review body
      const reviewBody = `## 🤖 AI Code Review\n\n` +
        `**Score:** ${reviewResult.summary.score}/100\n\n` +
        `**Issues Found:**\n` +
        `- ❌ ${reviewResult.summary.errors} errors\n` +
        `- ⚠️ ${reviewResult.summary.warnings} warnings\n` +
        `- 💡 ${reviewResult.summary.suggestions} suggestions\n\n` +
        (reviewResult.recommendations.length > 0
          ? `**Recommendations:**\n${reviewResult.recommendations.map(r => `- ${r}`).join('\n')}\n\n`
          : '') +
        `*Reviewed ${reviewResult.files.length} file(s) in ${reviewResult.estimatedReviewTime}*`;

      try {
        // Submit review with comments
        if (comments.length > 0) {
          await octokit.pulls.createReview({
            owner,
            repo,
            pull_number: pr_number,
            body: reviewBody,
            event: reviewResult.summary.errors > 0 ? 'REQUEST_CHANGES' : 'COMMENT',
            comments: comments.slice(0, 30), // Limit to 30 comments per review
          });
        } else {
          // Just add a comment if no inline comments
          await octokit.pulls.createReview({
            owner,
            repo,
            pull_number: pr_number,
            body: reviewBody,
            event: reviewResult.summary.score >= 90 ? 'APPROVE' : 'COMMENT',
          });
        }
      } catch (err: any) {
        console.error('Failed to submit review to GitHub:', err);
        return NextResponse.json({
          success: true,
          reviewResult,
          warning: 'Review completed but failed to submit to GitHub: ' + err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      reviewResult,
      submitted: submit_review && pr_number ? true : false,
    });
  } catch (error: any) {
    console.error('Error performing code review:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to perform code review' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/github/review
 * Get code review for a specific PR
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 * - pr_number: PR number
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const pr_number = searchParams.get('pr_number');

    if (!owner || !repo || !pr_number) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, pr_number' },
        { status: 400 }
      );
    }

    // Get GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 403 }
      );
    }

    const octokit = new Octokit({
      auth: connection.accessToken,
    });

    // Get reviews for PR
    const { data: reviews } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: parseInt(pr_number),
    });

    // Filter for AI reviews (contain "AI Code Review" in body)
    const aiReviews = reviews.filter(r => r.body?.includes('AI Code Review'));

    return NextResponse.json({
      success: true,
      reviews: aiReviews,
      count: aiReviews.length,
    });
  } catch (error: any) {
    console.error('Error fetching code reviews:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch code reviews' },
      { status: 500 }
    );
  }
}
