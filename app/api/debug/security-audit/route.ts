// EMERGENCY SECURITY AUDIT - Find Hollywood's real account and investigate fake users
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Get FULL Clerk user info (not just ID)
    const clerkUser = await currentUser();
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUser || !clerkUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🚨 SECURITY AUDIT START');
    console.log('Clerk User ID:', clerkUserId);
    console.log('Clerk Email:', clerkUser.emailAddresses);
    console.log('Clerk Primary Email:', clerkUser.primaryEmailAddress?.emailAddress);

    // Find user by Clerk ID
    const userByClerkId = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserId },
      include: {
        conversations: {
          include: {
            messages: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                role: true,
                content: true,
                createdAt: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    // Find user by real email
    const userByRealEmail = await prisma.user.findUnique({
      where: { email: 'iamhollywoodpro@gmail.com' },
      include: {
        conversations: {
          include: {
            messages: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                role: true,
                content: true,
                createdAt: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    // Get ALL users to find suspicious accounts
    const allUsers = await prisma.user.findMany({
      include: {
        conversations: {
          select: {
            id: true,
            title: true,
            messageCount: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        googleDrive: {
          select: {
            googleEmail: true,
            isConnected: true,
            lastSyncAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Analyze for suspicious patterns
    const suspiciousUsers = allUsers.filter(user => {
      const hasFakeEmail = !user.email.includes('@') || user.email.includes('proagniul') || user.email.includes('graphixx');
      const hasNoConversations = user.conversations.length === 0;
      const createdRecently = new Date(user.createdAt) > new Date('2025-11-20');
      return hasFakeEmail || (hasNoConversations && createdRecently);
    });

    return NextResponse.json({
      CRITICAL_INFO: {
        currentClerkUserId: clerkUserId,
        clerkPrimaryEmail: clerkUser.primaryEmailAddress?.emailAddress,
        clerkAllEmails: clerkUser.emailAddresses.map(e => e.emailAddress),
        clerkCreatedAt: clerkUser.createdAt,
      },
      YOUR_DATABASE_USER: userByClerkId ? {
        id: userByClerkId.id,
        clerkUserId: userByClerkId.clerkUserId,
        email: userByClerkId.email,
        createdAt: userByClerkId.createdAt,
        conversationCount: userByClerkId.conversations.length,
        conversations: userByClerkId.conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          messageCount: conv.messageCount,
          createdAt: conv.createdAt,
          recentMessages: conv.messages,
        })),
      } : 'NO USER FOUND WITH YOUR CLERK ID',
      REAL_EMAIL_USER: userByRealEmail ? {
        id: userByRealEmail.id,
        clerkUserId: userByRealEmail.clerkUserId,
        email: userByRealEmail.email,
        createdAt: userByRealEmail.createdAt,
        conversationCount: userByRealEmail.conversations.length,
        conversations: userByRealEmail.conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          messageCount: conv.messageCount,
          createdAt: conv.createdAt,
          recentMessages: conv.messages,
        })),
      } : 'NO USER FOUND WITH iamhollywoodpro@gmail.com',
      ALL_USERS_IN_DATABASE: allUsers.map(user => ({
        id: user.id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        createdAt: user.createdAt,
        conversationCount: user.conversations.length,
        conversations: user.conversations.map(c => ({
          id: c.id,
          title: c.title,
          messageCount: c.messageCount,
        })),
        googleDrive: user.googleDrive,
      })),
      SUSPICIOUS_ACCOUNTS: suspiciousUsers.map(user => ({
        id: user.id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        createdAt: user.createdAt,
        conversationCount: user.conversations.length,
        reason: !user.email.includes('@') ? 'INVALID_EMAIL_FORMAT' : 
                user.email.includes('proagniul') ? 'SUSPICIOUS_EMAIL' :
                user.conversations.length === 0 ? 'NO_CONVERSATIONS' : 'OTHER',
      })),
      SUMMARY: {
        totalUsers: allUsers.length,
        suspiciousUsers: suspiciousUsers.length,
        totalConversations: allUsers.reduce((sum, u) => sum + u.conversations.length, 0),
        usersWithRealEmails: allUsers.filter(u => u.email.includes('@')).length,
      },
    });
  } catch (error: any) {
    console.error('🚨 SECURITY AUDIT ERROR:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
