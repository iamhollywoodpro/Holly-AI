import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
interface CodeGenerateRequest {
  prompt: string;
  language: string;
  userId: string;
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CodeGenerateRequest;
    const { prompt, language, userId } = body;
if (!prompt || !language || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, language, userId' },
        { status: 400 }
      );
    }
return NextResponse.json({
      success: true,
      code: `// Generated code\nconsole.log('Hello from HOLLY!');`,
      language,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Code generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
