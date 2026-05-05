// Work Log Cleanup Cron Job
// Runs daily at 3 AM UTC via Vercel Cron
// Handles Hot → Warm → Cold → Delete transitions

import { NextResponse } from 'next/server';
import { cleanupExpiredLogs, updateSystemStats } from '@/lib/logging/work-log-service';

export const runtime = 'nodejs'; // Cron requires Node runtime

// Verify request comes from Vercel Cron
function isValidCronRequest(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // In development, allow without auth
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // In production, require Bearer token matching CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  try {
    // Verify authorization
    if (!isValidCronRequest(req)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }
    
    console.log('🧹 Work Log Cleanup - Starting...');
    const startTime = Date.now();
    
    // Run cleanup (Hot → Warm → Cold → Delete)
    const stats = await cleanupExpiredLogs();
    
    // Update system stats
    await updateSystemStats();
    
    const duration = Date.now() - startTime;
    
    const result = {
      success: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      stats
    };
    
    console.log('✅ Work Log Cleanup - Complete:', result);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ Work Log Cleanup - Failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Cleanup failed', 
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Manual trigger endpoint (for testing)
export async function POST(req: Request) {
  try {
    // In production, require authentication
    if (process.env.NODE_ENV === 'production') {
      if (!isValidCronRequest(req)) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    console.log('🧪 Manual Work Log Cleanup - Starting...');
    const startTime = Date.now();
    
    const stats = await cleanupExpiredLogs();
    await updateSystemStats();
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      manual: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      stats
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Manual cleanup failed', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}
