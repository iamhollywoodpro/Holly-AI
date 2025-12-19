import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Octokit } from '@octokit/rest';

export const runtime = 'nodejs';


/**
 * POST /api/github/issues/bulk
 * Perform bulk operations on multiple issues
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - issue_numbers: Array of issue numbers
 * - operation: 'close' | 'reopen' | 'add_labels' | 'remove_labels' | 'assign' | 'unassign'
 * - labels: Array of label names (for add_labels/remove_labels)
 * - assignees: Array of usernames (for assign/unassign)
 * - state_reason: 'completed' | 'not_planned' (for close operation)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      owner, 
      repo, 
      issue_numbers, 
      operation, 
      labels, 
      assignees,
      state_reason 
    } = body;

    if (!owner || !repo || !issue_numbers || !operation) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, issue_numbers, operation' },
        { status: 400 }
      );
    }

    if (!Array.isArray(issue_numbers) || issue_numbers.length === 0) {
      return NextResponse.json(
        { error: 'issue_numbers must be a non-empty array' },
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

    const results = {
      successful: [] as number[],
      failed: [] as { issue: number; error: string }[],
    };

    // Process each issue
    for (const issueNumber of issue_numbers) {
      try {
        switch (operation) {
          case 'close':
            await octokit.issues.update({
              owner,
              repo,
              issue_number: issueNumber,
              state: 'closed',
              state_reason: state_reason || 'completed',
            });
            break;

          case 'reopen':
            await octokit.issues.update({
              owner,
              repo,
              issue_number: issueNumber,
              state: 'open',
            });
            break;

          case 'add_labels':
            if (!labels || !Array.isArray(labels)) {
              throw new Error('labels array required for add_labels operation');
            }
            await octokit.issues.addLabels({
              owner,
              repo,
              issue_number: issueNumber,
              labels,
            });
            break;

          case 'remove_labels':
            if (!labels || !Array.isArray(labels)) {
              throw new Error('labels array required for remove_labels operation');
            }
            // Remove each label individually
            for (const label of labels) {
              try {
                await octokit.issues.removeLabel({
                  owner,
                  repo,
                  issue_number: issueNumber,
                  name: label,
                });
              } catch (err) {
                // Ignore if label doesn't exist on issue
                console.log(`Label ${label} not found on issue ${issueNumber}`);
              }
            }
            break;

          case 'assign':
            if (!assignees || !Array.isArray(assignees)) {
              throw new Error('assignees array required for assign operation');
            }
            await octokit.issues.addAssignees({
              owner,
              repo,
              issue_number: issueNumber,
              assignees,
            });
            break;

          case 'unassign':
            if (!assignees || !Array.isArray(assignees)) {
              throw new Error('assignees array required for unassign operation');
            }
            await octokit.issues.removeAssignees({
              owner,
              repo,
              issue_number: issueNumber,
              assignees,
            });
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        results.successful.push(issueNumber);
      } catch (error: any) {
        console.error(`Error processing issue #${issueNumber}:`, error);
        results.failed.push({
          issue: issueNumber,
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: issue_numbers.length,
        successful: results.successful.length,
        failed: results.failed.length,
      },
    });
  } catch (error: any) {
    console.error('Error in bulk operation:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
