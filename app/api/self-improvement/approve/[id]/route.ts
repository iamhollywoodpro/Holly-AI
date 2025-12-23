import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { Octokit } from "@octokit/rest";
import { sendEmail, generateStatusUpdateEmail } from "@/lib/notifications/email";
import { logger } from "@/lib/monitoring/logger";

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Fetch the improvement
    const improvement = await prisma.selfImprovement.findUnique({
      where: { id },
    });

    if (!improvement) {
      return NextResponse.json(
        { error: "Improvement not found" },
        { status: 404 }
      );
    }

    if (improvement.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Initialize Octokit
    const octokit = new Octokit({
      auth: process.env.HOLLY_GITHUB_TOKEN,
    });

    const owner = process.env.HOLLY_GITHUB_OWNER!;
    const repo = process.env.HOLLY_GITHUB_REPO!;

    // Merge the pull request if it exists
    if (improvement.prNumber) {
      try {
        await octokit.pulls.merge({
          owner,
          repo,
          pull_number: improvement.prNumber,
          commit_title: `✅ Approved: ${improvement.problemStatement.substring(0, 50)}`,
          commit_message: `Approved by ${userId} via HOLLY's self-improvement dashboard`,
          merge_method: "squash",
        });
      } catch (error: any) {
        console.error("Failed to merge PR:", error);
        return NextResponse.json(
          { error: `Failed to merge PR: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Update the improvement status
    const updatedImprovement = await prisma.selfImprovement.update({
      where: { id },
      data: {
        status: "APPROVED",
        updatedAt: new Date(),
      },
    });

    // Send email notification
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const userEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;
      const userName = user.firstName || 'there';

      if (userEmail) {
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://holly.nexamusicgroup.com'}/self-improvement`;
        const emailHtml = generateStatusUpdateEmail(
          userName,
          improvement.problemStatement.substring(0, 100),
          'approved',
          'Your approval has been recorded. The changes have been merged and will be deployed automatically via CI/CD.',
          dashboardUrl
        );

        await sendEmail({
          to: userEmail,
          subject: `✅ Improvement Approved: ${improvement.title}`,
          html: emailHtml,
        });

        logger.info('Approval notification email sent', {
          improvementId: id,
          userId,
        });
      }
    } catch (emailError) {
      // Don't fail the entire request if email fails
      logger.error('Failed to send approval notification email', {
        improvementId: id,
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
      });
    }

    logger.improvementApproved(id, userId);

    return NextResponse.json({
      success: true,
      improvement: updatedImprovement,
      message: "Improvement approved and PR merged successfully",
    });
  } catch (error) {
    console.error("Error approving improvement:", error);
    return NextResponse.json(
      { error: "Failed to approve improvement" },
      { status: 500 }
    );
  }
}
