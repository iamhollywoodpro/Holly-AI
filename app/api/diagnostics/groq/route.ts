import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY || '';
  
  if (!apiKey) {
    return NextResponse.json({
      status: 'error',
      message: 'GROQ_API_KEY environment variable is missing or empty in the runtime container.',
      resolution: 'Ensure the key is saved and the container was redeployed.'
    }, { status: 500 });
  }

  try {
    const groq = new Groq({ apiKey });
    
    // Attempt a minimal completion to test authentication and rate limits
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'hello' }],
      max_tokens: 10
    });

    return NextResponse.json({
      status: 'success',
      message: 'Groq API is fully operational and authenticated.',
      modelUsed: completion.model,
      keyPreview: `gsk_...${apiKey.slice(-5)}`
    });

  } catch (error: any) {
    // Return the exact error thrown by the Groq API
    return NextResponse.json({
      status: 'error',
      message: 'Groq API actively rejected the request.',
      groqErrorName: error.name || 'Unknown Error',
      groqErrorMessage: error.message || String(error),
      httpStatus: error.status || 'N/A',
      errorDetails: error.error || 'No detailed JSON provided by Groq'
    }, { status: 500 });
  }
}
