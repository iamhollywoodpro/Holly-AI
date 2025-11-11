import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/auth-helpers';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DEBUG ENDPOINT: Check auth state
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== AUTH DEBUG START ===');
    
    // Check cookies
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    console.log('[Debug] Total cookies:', allCookies.length);
    
    const supabaseCookies = allCookies.filter(c => 
      c.name.includes('supabase') || c.name.includes('sb-')
    );
    console.log('[Debug] Supabase cookies found:', supabaseCookies.length);
    supabaseCookies.forEach(c => {
      console.log(`[Debug] Cookie: ${c.name} = ${c.value.substring(0, 50)}...`);
    });
    
    // Try to get user
    const supabase = await createClient();
    console.log('[Debug] Supabase client created');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('[Debug] getUser result:', { 
      hasUser: !!user, 
      userId: user?.id,
      error: error?.message 
    });
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('[Debug] getSession result:', { 
      hasSession: !!session,
      sessionError: sessionError?.message
    });
    
    console.log('=== AUTH DEBUG END ===');
    
    return NextResponse.json({
      success: true,
      debug: {
        totalCookies: allCookies.length,
        supabaseCookies: supabaseCookies.length,
        cookieNames: supabaseCookies.map(c => c.name),
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        hasSession: !!session,
        authError: error?.message,
        sessionError: sessionError?.message,
        env: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        }
      }
    });
    
  } catch (error) {
    console.error('[Debug] Exception:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
