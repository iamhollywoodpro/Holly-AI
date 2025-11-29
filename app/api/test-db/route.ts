// Test Database Connection
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test 1: Auth
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({
        test: 'HOLLY Database Test',
        clerk: 'FAIL - Not authenticated',
        database: 'SKIPPED',
        github: 'SKIPPED',
        drive: 'SKIPPED'
      });
    }
    
    // Test 2: Database connection
    let dbStatus = 'OK';
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { clerkUserId: userId },
        select: { id: true, email: true }
      });
      
      if (!user) {
        dbStatus = 'User not found in database';
      }
    } catch (dbError: any) {
      dbStatus = `ERROR: ${dbError.message}`;
    }
    
    // Test 3: GitHub Connection
    let githubStatus = 'Not connected';
    if (user) {
      try {
        const githubConn = await prisma.gitHubConnection.findUnique({
          where: { userId: user.id },
          select: { isConnected: true, githubUsername: true }
        });
        
        if (githubConn?.isConnected) {
          githubStatus = `Connected as @${githubConn.githubUsername}`;
        }
      } catch (ghError: any) {
        githubStatus = `ERROR: ${ghError.message}`;
      }
    }
    
    // Test 4: Google Drive Connection
    let driveStatus = 'Not connected';
    if (user) {
      try {
        const driveConn = await prisma.googleDriveConnection.findUnique({
          where: { userId: user.id },
          select: { isConnected: true, googleEmail: true }
        });
        
        if (driveConn?.isConnected) {
          driveStatus = `Connected as ${driveConn.googleEmail}`;
        }
      } catch (driveError: any) {
        driveStatus = `ERROR: ${driveError.message}`;
      }
    }
    
    return NextResponse.json({
      test: 'HOLLY Database Test',
      clerk: `OK - User ID: ${userId}`,
      database: dbStatus,
      user: user ? { id: user.id, email: user.email } : null,
      github: githubStatus,
      drive: driveStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return NextResponse.json({
      test: 'HOLLY Database Test',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
