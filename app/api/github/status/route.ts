// Check GitHub Connection Status
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    
    if (!user) {
      return NextResponse.json({
        success: true,
        connected: false,
      });
    }
    
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
      select: {
        isConnected: true,
        githubUsername: true,
        githubEmail: true,
        githubName: true,
        githubAvatar: true,
        githubBio: true,
        publicRepos: true,
        privateRepos: true,
        followers: true,
        following: true,
        lastSyncAt: true,
        autoSync: true,
      },
    });
    
    if (!connection) {
      return NextResponse.json({
        success: true,
        connected: false,
      });
    }
    
    return NextResponse.json({
      success: true,
      connected: connection.isConnected,
      user: {
        username: connection.githubUsername,
        email: connection.githubEmail,
        name: connection.githubName,
        avatar: connection.githubAvatar,
        bio: connection.githubBio,
      },
      stats: {
        publicRepos: connection.publicRepos,
        privateRepos: connection.privateRepos,
        followers: connection.followers,
        following: connection.following,
      },
      settings: {
        autoSync: connection.autoSync,
      },
      lastSyncAt: connection.lastSyncAt,
    });
    
  } catch (error: any) {
    console.error('Check GitHub status error:', error);
    
    return NextResponse.json(
      { error: 'Failed to check GitHub status' },
      { status: 500 }
    );
  }
}
