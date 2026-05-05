// API Route: Get User Context for HOLLY's Memory
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserContext, generatePersonalizedGreeting } from '@/lib/memory/user-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get comprehensive user context
    const context = await getUserContext(clerkUserId);
    
    if (!context) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Generate personalized greeting
    const greeting = generatePersonalizedGreeting(context);
    
    return NextResponse.json({
      context,
      greeting,
      message: 'User context retrieved successfully',
    });
    
  } catch (error: any) {
    console.error('[User Context] Error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get user context', message: error.message },
      { status: 500 }
    );
  }
}
