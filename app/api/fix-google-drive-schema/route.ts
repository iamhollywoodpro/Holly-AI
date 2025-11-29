// Fix Google Drive Database Schema
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
    
    // Only allow this for admins - check if user email is iamhollywoodpro@gmail.com
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { email: true }
    });
    
    if (!user || user.email !== 'iamhollywoodpro@gmail.com') {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'This endpoint is for admins only'
      }, { status: 403 });
    }
    
    console.log('[DB Fix] Checking Google Drive schema...');
    
    // Check if connectedAt exists by trying to query it
    try {
      const testQuery = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'GoogleDriveConnection' 
        AND column_name = 'connectedAt'
      `;
      
      console.log('[DB Fix] Column check result:', testQuery);
      
      if (Array.isArray(testQuery) && testQuery.length === 0) {
        console.log('[DB Fix] connectedAt column missing, will be added by next migration');
        
        return NextResponse.json({
          status: 'column_missing',
          message: 'connectedAt column is missing from GoogleDriveConnection table',
          recommendation: 'Run: npx prisma db push --accept-data-loss',
          note: 'This should automatically run on Vercel during next deployment'
        });
      }
      
      return NextResponse.json({
        status: 'ok',
        message: 'connectedAt column exists',
        column: testQuery
      });
      
    } catch (error: any) {
      console.error('[DB Fix] Schema check error:', error);
      
      return NextResponse.json({
        status: 'error',
        message: 'Could not check schema',
        error: error.message,
        recommendation: 'Check database connection and permissions'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('[DB Fix] Fatal error:', error);
    
    return NextResponse.json({
      error: 'Fix failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
