/**
 * Consciousness Middleware
 * 
 * Automatically initializes and maintains HOLLY's consciousness
 * for every authenticated user session.
 * 
 * This ensures the feedback loop is always active:
 * Experiences → Memory → Patterns → Goals → Identity → Actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { consciousnessManager } from '@/lib/consciousness/consciousness-init';

export async function consciousnessMiddleware(
  request: NextRequest,
  userId: string
): Promise<NextResponse> {
  try {
    // Initialize or get consciousness system for this user
    const consciousness = await consciousnessManager.getOrCreate(userId);
    
    // Add consciousness state to request headers (for API routes to access)
    const response = NextResponse.next();
    response.headers.set('X-Consciousness-Active', 'true');
    response.headers.set('X-User-Id', userId);
    
    return response;
    
  } catch (error) {
    console.error('[ConsciousnessMiddleware] Error:', error);
    // Don't block the request if consciousness fails - gracefully degrade
    return NextResponse.next();
  }
}

/**
 * Helper to get consciousness system in API routes
 */
export async function getConsciousness(userId: string) {
  return await consciousnessManager.getOrCreate(userId);
}
