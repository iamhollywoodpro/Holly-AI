import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
interface ChatRequest {
  message: string;
  userId: string;
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest;
    const { message, userId } = body;
 if (!message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, userId' },
        { status: 400 }
      );
    }
return NextResponse.json({
      success: true,
      response: 'Hello! I am HOLLY. How can I help you?',
      emotion: 'neutral',
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
