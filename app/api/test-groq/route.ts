import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function GET() {
  try {
    // Check if API key exists
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        status: 'error',
        message: 'GROQ_API_KEY not configured in environment variables',
        hasKey: false,
      }, { status: 500 });
    }

    // Test Groq API with simple request
    const groq = new Groq({ apiKey });
    
    const response = await groq.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "API Working" if you can read this.' },
      ],
      max_tokens: 50,
    });

    return NextResponse.json({
      status: 'success',
      message: 'Groq API is working correctly',
      hasKey: true,
      response: response.choices[0].message.content,
      model: 'mixtral-8x7b-32768',
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      hasKey: !!process.env.GROQ_API_KEY,
      error: error.toString(),
    }, { status: 500 });
  }
}
