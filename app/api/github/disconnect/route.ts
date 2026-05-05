// Disconnect GitHub Account
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if GitHub is connected
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id }
    });
    
    if (!connection) {
      return NextResponse.json({ 
        error: 'GitHub not connected',
        message: 'No GitHub connection found for this user'
      }, { status: 400 });
    }
    
    console.log('[GitHub Disconnect] Disconnecting GitHub for user:', user.id);
    
    // Delete all repositories for this user
    const deletedRepos = await prisma.gitHubRepository.deleteMany({
      where: { userId: user.id }
    });
    
    console.log(`[GitHub Disconnect] Deleted ${deletedRepos.count} repositories`);
    
    // Delete the GitHub connection
    await prisma.gitHubConnection.delete({
      where: { userId: user.id }
    });
    
    console.log('[GitHub Disconnect] Successfully disconnected GitHub');
    
    return NextResponse.json({
      success: true,
      message: 'GitHub disconnected successfully',
      deletedRepos: deletedRepos.count
    });
    
  } catch (error: any) {
    console.error('[GitHub Disconnect] Error:', error);
    
    return NextResponse.json({
      error: 'Disconnect failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
