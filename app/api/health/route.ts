import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasGroqKey = !!process.env.GROQ_API_KEY;
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  const hasSupabaseKey = !!process.env.SUPABASE_ANON_KEY;

  return NextResponse.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    apiKeys: {
      anthropic: hasAnthropicKey ? 'configured' : 'missing',
      groq: hasGroqKey ? 'configured' : 'missing',
      supabase: hasSupabaseUrl && hasSupabaseKey ? 'configured' : 'missing',
    },
    ready: hasAnthropicKey || hasGroqKey,
  });
}
