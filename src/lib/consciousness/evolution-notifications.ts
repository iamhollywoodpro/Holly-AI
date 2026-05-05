/**
 * HOLLY Evolution Notifications — Phase 4.3
 *
 * When HOLLY generates self-improvement proposals, notify Steve:
 * - Dashboard: /app/evolution/page.tsx shows pending proposals
 * - Chat: HOLLY mentions proposals in next conversation
 * - API: endpoints for review/approval/rejection
 */

import { prisma } from '@/lib/db';

export interface EvolutionProposal {
  id: string;
  userId: string;
  title: string;
  description: string;
  filePath: string;
  changeType: 'bug_fix' | 'performance' | 'security' | 'maintainability' | 'feature';
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'reverted';
  proposedCode?: string;
  reasoning?: string;
  createdAt: Date;
}

/**
 * Get all pending evolution proposals for a user (for dashboard display)
 */
export async function getPendingProposals(userId: string): Promise<EvolutionProposal[]> {
  const events = await prisma.learningEvent.findMany({
    where: {
      userId,
      type: 'self_improvement_check',
      processed: false,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return events
    .map((event: any) => {
      const data = event.data as any;
      return {
        id: event.id,
        userId: event.userId,
        title: data.title || 'Self-improvement proposal',
        description: data.description || data.reasoning || '',
        filePath: data.filePath || '',
        changeType: data.changeType || 'maintainability',
        riskLevel: data.riskLevel || data.risk || 'medium',
        status: data.status || 'pending',
        proposedCode: data.proposedCode,
        reasoning: data.reasoning,
        createdAt: new Date(event.createdAt),
      } as EvolutionProposal;
    })
    .filter(p => p.status === 'pending');
}

/**
 * Approve a proposal — marks it for application
 */
export async function approveProposal(proposalId: string, userId: string): Promise<boolean> {
  try {
    const event = await prisma.learningEvent.findUnique({ where: { id: proposalId } });
    if (!event || event.userId !== userId) return false;

    const data = { ...((event.data as any) || {}), status: 'approved', approvedAt: new Date().toISOString() };
    await prisma.learningEvent.update({
      where: { id: proposalId },
      data: { data, processed: false },
    });

    // Create notification for HOLLY to mention in next chat
    await prisma.notification.create({
      data: {
        type: 'evolution_approved',
        title: 'Evolution Proposal Approved',
        message: `Steve approved your proposal: ${(data as any).title || 'Self-improvement'}`,
        category: 'self_improvement',
        priority: 'high',
        status: 'unread',
        userId,
        clerkUserId: '',
        actionData: { proposalId, action: 'approved' } as any,
      },
    });

    return true;
  } catch (err) {
    console.error('[EvolutionNotifications] Approve failed:', err);
    return false;
  }
}

/**
 * Reject a proposal — marks it as rejected with reason
 */
export async function rejectProposal(
  proposalId: string,
  userId: string,
  reason?: string,
): Promise<boolean> {
  try {
    const event = await prisma.learningEvent.findUnique({ where: { id: proposalId } });
    if (!event || event.userId !== userId) return false;

    const data = {
      ...((event.data as any) || {}),
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || 'Not specified',
    };

    await prisma.learningEvent.update({
      where: { id: proposalId },
      data: { data, processed: true },
    });

    return true;
  } catch (err) {
    console.error('[EvolutionNotifications] Reject failed:', err);
    return false;
  }
}

/**
 * Get the count of unread proposals for chat context injection
 */
export async function getUnreadProposalCount(userId: string): Promise<number> {
  try {
    return await prisma.learningEvent.count({
      where: {
        userId,
        type: 'self_improvement_check',
        processed: false,
      },
    });
  } catch {
    return 0;
  }
}

/**
 * Get a summary of proposals for injection into chat context
 */
export async function getProposalSummaryForChat(userId: string): Promise<string | null> {
  const proposals = await getPendingProposals(userId);
  if (proposals.length === 0) return null;

  const summary = proposals
    .slice(0, 3)
    .map(p => `- "${p.title}" (${p.changeType}, risk: ${p.riskLevel})`)
    .join('\n');

  return `HOLLY has ${proposals.length} pending self-improvement proposal(s):\n${summary}`;
}