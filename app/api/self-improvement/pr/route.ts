import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import { sendEmail, generatePRNotificationEmail } from '@/lib/notifications/email';
import { sendWebhookNotifications, generatePRWebhookMessage } from '@/lib/notifications/webhook';
import { logger } from '@/lib/monitoring/logger';
import { analyzeRisk } from '@/lib/autonomy/risk-analyzer';
import { calculateConfidence } from '@/lib/autonomy/confidence-scorer';
import { makeDecision } from '@/lib/autonomy/decision-engine';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

/**
 * POST /api/self-improvement/pr
 * Create a pull request for a self-improvement
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      improvementId,
      title,
      description,
      labels
    } = body;

    // Validate required fields
    if (!improvementId || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the improvement record
    const improvement = await prisma.selfImprovement.findUnique({
      where: { id: improvementId }
    });

    if (!improvement) {
      return NextResponse.json(
        { error: 'Improvement not found' },
        { status: 404 }
      );
    }

    if (improvement.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // PHASE 3: Autonomous Decision-Making
    // Analyze the improvement using the decision engine
    const riskAnalysis = await analyzeRisk({
      trigger: improvement.triggerType,
      problemStatement: improvement.problemStatement,
      solutionApproach: improvement.solutionApproach,
      filesChanged: improvement.filesChanged || []
    });

    const confidence = await calculateConfidence({
      trigger: improvement.triggerType,
      filesChanged: improvement.filesChanged || []
    });

    const decision = await makeDecision({
      improvementId,
      riskAnalysis,
      confidenceScore: confidence
    });

    // Log the autonomous decision
    logger.autonomousDecision({
      improvementId,
      decision: decision.action,
      riskScore: riskAnalysis.riskScore,
      confidenceScore: confidence.confidenceScore,
      reasoning: decision.reasoning
    });

    // Log decision (metadata field doesn't exist in schema, so just log it)
    // If decision is to auto-approve and confidence is high enough, skip human review
    if (decision.action === 'approve' && confidence.confidenceScore >= 85) {
      logger.info('Auto-approving high-confidence improvement', { improvementId });
      // Auto-merge will be handled by the approve endpoint
    }

    // Initialize GitHub client
    const githubToken = process.env.HOLLY_GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    const octokit = new Octokit({ auth: githubToken });
    const owner = process.env.HOLLY_GITHUB_OWNER || 'iamhollywoodpro';
    const repo = process.env.HOLLY_GITHUB_REPO || 'Holly-AI';

    // Create the pull request
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body: description,
      head: improvement.branchName,
      base: 'main'
    });

    // Add labels if provided
    if (labels && labels.length > 0) {
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: pr.number,
        labels
      });
    }

    // Update the improvement record
    const updatedImprovement = await prisma.selfImprovement.update({
      where: { id: improvementId },
      data: {
        status: 'pr_created',
        prNumber: pr.number,
        prUrl: pr.html_url,
        updatedAt: new Date()
      }
    });

    // Send email notification
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const userEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;
      const userName = user.firstName || 'there';

      if (userEmail) {
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://holly.nexamusicgroup.com'}/self-improvement`;
        const emailHtml = generatePRNotificationEmail(
          userName,
          title,
          description,
          pr.html_url,
          dashboardUrl
        );

        await sendEmail({
          to: userEmail,
          subject: `🧠 HOLLY created a new improvement: ${title}`,
          html: emailHtml,
        });

        logger.info('PR notification email sent', {
          improvementId,
          userId,
        });
      }
    } catch (emailError) {
      // Don't fail the entire request if email fails
      logger.error('Failed to send PR notification email', {
        improvementId,
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
      });
    }

    // Send webhook notifications (Slack/Discord)
    try {
      const webhookMessage = generatePRWebhookMessage(
        title,
        description,
        pr.html_url,
        improvement.riskLevel
      );
      await sendWebhookNotifications(webhookMessage);
    } catch (webhookError) {
      // Don't fail the entire request if webhook fails
      logger.error('Failed to send webhook notifications', {
        improvementId,
        error: webhookError instanceof Error ? webhookError.message : 'Unknown error',
      });
    }

    logger.improvementCreated(improvementId, title, improvement.riskLevel);

    return NextResponse.json({
      improvementId,
      prNumber: pr.number,
      prUrl: pr.html_url,
      status: 'pr_created',
      message: 'Pull request created successfully'
    });

  } catch (error) {
    console.error('Error creating pull request:', error);
    logger.error('Failed to create pull request', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json(
      { error: 'Failed to create pull request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
