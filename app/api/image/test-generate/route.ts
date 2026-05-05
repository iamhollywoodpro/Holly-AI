import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// DIAGNOSTIC ENDPOINT - Test image generation flow
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    step: 'Starting',
    errors: [],
  };

  try {
    // Step 1: Check authentication (OPTIONAL for diagnostic)
    diagnostics.step = 'Checking auth';
    const { userId } = await auth();
    diagnostics.auth = { 
      userId: userId ? 'Present' : 'Not authenticated (running in diagnostic mode)', 
      userIdLength: userId?.length,
      note: 'Authentication not required for diagnostics'
    };

    // Don't block if no auth - this is a diagnostic tool
    const effectiveUserId = userId || 'diagnostic-test-user';

    // Step 2: Parse request body
    diagnostics.step = 'Parsing request';
    const body = await request.json().catch(() => ({ prompt: 'diagnostic test' }));
    diagnostics.request = {
      hasPrompt: !!body.prompt,
      promptLength: body.prompt?.length,
      hasConversationId: !!body.conversationId,
      keys: Object.keys(body),
    };

    if (!body.prompt) {
      diagnostics.warnings = ['No prompt provided - using default test prompt'];
      body.prompt = 'a diagnostic test image';
    }

    // Step 3: Check environment variables
    diagnostics.step = 'Checking env vars';
    diagnostics.env = {
      hasHuggingFaceKey: !!process.env.HUGGINGFACE_API_KEY,
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      nodeEnv: process.env.NODE_ENV,
    };

    if (!process.env.HUGGINGFACE_API_KEY) {
      diagnostics.errors.push('HUGGINGFACE_API_KEY missing');
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      diagnostics.errors.push('BLOB_READ_WRITE_TOKEN missing');
    }

    // Step 4: Test Image Generation API (Pollinations)
    diagnostics.step = 'Testing Image Generation API';
    const imageTest = await fetch('https://image.pollinations.ai/prompt/test?width=512&height=512', {
      method: 'GET',
    });

    diagnostics.image_generation = {
      status: imageTest.status,
      statusText: imageTest.statusText,
      contentType: imageTest.headers.get('content-type'),
      provider: 'Pollinations AI (Free)',
    };

    if (!imageTest.ok && imageTest.status !== 302) {
      const errorText = await imageTest.text().catch(() => 'Could not read error');
      diagnostics.errors.push(`Image API error: ${errorText.substring(0, 200)}`);
    }

    diagnostics.step = 'Complete';
    diagnostics.success = diagnostics.errors.length === 0;

    return NextResponse.json({
      success: diagnostics.errors.length === 0,
      message: diagnostics.errors.length === 0 
        ? 'All systems operational for image generation'
        : 'Issues detected',
      diagnostics,
    });

  } catch (error) {
    diagnostics.step = 'Exception caught';
    diagnostics.exception = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    };

    return NextResponse.json({ success: false, diagnostics }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    endpoint: '/api/image/test-generate',
    method: 'POST',
    purpose: 'Diagnostic endpoint to test image generation capabilities',
    requiredEnv: ['HUGGINGFACE_API_KEY', 'BLOB_READ_WRITE_TOKEN'],
  });
}
