import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Test endpoint to debug auth issues
 */
export async function GET() {
  try {
    console.log('🧪 [TEST] Starting auth test...');
    
    // Test 1: auth()
    const { userId } = await auth();
    console.log('🧪 [TEST] auth() userId:', userId || 'NULL');
    
    // Test 2: currentUser()
    const user = await currentUser();
    console.log('🧪 [TEST] currentUser():', user ? `${user.id} (${user.primaryEmailAddress?.emailAddress})` : 'NULL');
    
    return NextResponse.json({
      success: true,
      auth_userId: userId || null,
      currentUser_id: user?.id || null,
      currentUser_email: user?.primaryEmailAddress?.emailAddress || null,
      match: userId === user?.id,
    });
  } catch (error) {
    console.error('🧪 [TEST] ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
