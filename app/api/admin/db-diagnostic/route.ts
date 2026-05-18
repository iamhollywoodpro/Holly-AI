/**
 * Admin DB Diagnostic Endpoint
 * Phase 8.0.3 — Investigate missing chat history
 *
 * GET /api/admin/db-diagnostic — Check database state, conversation counts, user mapping
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Auth check
    const authResult = await auth();
    const userId = authResult.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run diagnostic queries in parallel
    const [
      totalConversations,
      totalMessages,
      totalUsers,
      recentConversations,
      orphanedConversations,
      userMapping,
      conversationAgeStats,
    ] = await Promise.all([
      // Total conversations
      prisma.conversation.count(),

      // Total messages
      prisma.message.count(),

      // Total users
      prisma.user.count(),

      // 5 most recent conversations with user info
      prisma.conversation.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          messageCount: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          user: { select: { id: true, name: true, email: true, clerkUserId: true } },
        },
      }),

      // Conversations with no associated user (orphaned)
      prisma.conversation.findMany({
        where: { user: null },
        take: 10,
        select: { id: true, title: true, userId: true, createdAt: true },
      }),

      // User mapping — check if Clerk IDs match
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          clerkUserId: true,
          _count: { select: { conversations: true, messages: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Conversation age distribution
      prisma.$queryRaw<Array<{ period: string; count: bigint }>>`
        SELECT
          CASE
            WHEN "updatedAt" > NOW() - INTERVAL '1 day' THEN 'last_24h'
            WHEN "updatedAt" > NOW() - INTERVAL '7 days' THEN 'last_week'
            WHEN "updatedAt" > NOW() - INTERVAL '30 days' THEN 'last_month'
            WHEN "updatedAt" > NOW() - INTERVAL '90 days' THEN 'last_quarter'
            ELSE 'older'
          END as period,
          COUNT(*) as count
        FROM "Conversation"
        GROUP BY period
        ORDER BY period
      `,
    ]);

    // Check for current user's conversations
    const currentUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        name: true,
        email: true,
        clerkUserId: true,
        _count: { select: { conversations: true, messages: true } },
      },
    });

    const currentUserConversations = currentUser
      ? await prisma.conversation.findMany({
          where: { userId: currentUser.id },
          take: 5,
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, messageCount: true, updatedAt: true },
        })
      : [];

    // Format age stats (convert BigInt to Number)
    const ageStats = conversationAgeStats.reduce<Record<string, number>>((acc, row) => {
      acc[row.period] = Number(row.count);
      return acc;
    }, {});

    // Diagnosis
    const diagnosis: string[] = [];

    if (totalConversations === 0) {
      diagnosis.push('⚠️ NO conversations in database — data may have been wiped by a migration');
    }

    if (orphanedConversations.length > 0) {
      diagnosis.push(`⚠️ ${orphanedConversations.length} orphaned conversations (no associated user) — possible user ID mismatch`);
    }

    if (!currentUser) {
      diagnosis.push('⚠️ Current authenticated user NOT found in database — Clerk ID mismatch. User needs to be created.');
    } else if (currentUser._count.conversations === 0) {
      diagnosis.push('⚠️ Current user has 0 conversations — either new user or conversations are linked to a different user ID');
    }

    if (totalConversations > 0 && currentUser && currentUser._count.conversations === 0) {
      diagnosis.push('💡 SUGGESTION: Conversations exist but not linked to current user. Check if clerkUserId changed after migration.');
    }

    if (diagnosis.length === 0) {
      diagnosis.push('✅ Database appears healthy — conversations and user mapping look correct');
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      currentClerkUser: userId,
      currentUser,
      stats: {
        totalConversations,
        totalMessages,
        totalUsers,
        conversationAge: ageStats,
      },
      currentUserConversations,
      recentConversations,
      orphanedConversations: orphanedConversations.length > 0 ? orphanedConversations : 'none',
      userMapping,
      diagnosis,
    });
  } catch (error) {
    console.error('[DB Diagnostic] Error:', error);
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
