// Health check endpoint with API key validation
// Returns which services are available based on configured API keys

import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      ai: {
        groq: {
          available: !!process.env.GROQ_API_KEY,
          models: ['deepseek-r1-distill-llama-70b', 'llama-3.3-70b-versatile'],
          status: process.env.GROQ_API_KEY ? 'configured' : 'missing_key'
        }
      },
      generation: {
        images: {
          available: !!process.env.HUGGINGFACE_API_KEY,
          models: 8,
          provider: 'Hugging Face',
          status: process.env.HUGGINGFACE_API_KEY ? 'configured' : 'missing_key'
        },
        videos: {
          available: !!process.env.HUGGINGFACE_API_KEY,
          models: 5,
          provider: 'Hugging Face',
          status: process.env.HUGGINGFACE_API_KEY ? 'configured' : 'missing_key'
        },
        music: {
          available: true, // Always available (has free alternatives)
          primary: 'Suno AI',
          alternatives: 4,
          status: 'configured'
        }
      },
      voice: {
        elevenlabs: {
          available: !!process.env.ELEVENLABS_API_KEY,
          voices: ['rachel', 'bella', 'elli', 'grace'],
          status: process.env.ELEVENLABS_API_KEY ? 'configured' : 'missing_key'
        }
      },
      database: {
        status: process.env.DATABASE_URL ? 'configured' : 'missing_keys'
      }
      }
    },
    warnings: [] as string[],
    errors: [] as string[]
  };

  // Check for missing critical keys
  if (!process.env.GROQ_API_KEY) {
    health.warnings.push('GROQ_API_KEY not configured - AI chat will not work');
  }

  if (!process.env.HUGGINGFACE_API_KEY) {
    health.warnings.push('HUGGINGFACE_API_KEY not configured - Image/video generation unavailable');
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    health.warnings.push('ELEVENLABS_API_KEY not configured - Voice synthesis unavailable');
  }

  }

  // Set overall status
  if (health.errors.length > 0) {
    health.status = 'error';
  } else if (health.warnings.length > 0) {
    health.status = 'warning';
  }

  return NextResponse.json(health, {
    status: health.status === 'error' ? 500 : 200
  });
}

// POST endpoint for testing specific service
export async function POST(req: Request) {
  try {
    const { service } = await req.json();

    switch (service) {
      case 'groq':
        if (!process.env.GROQ_API_KEY) {
          return NextResponse.json({ 
            error: 'GROQ_API_KEY not configured',
            instructions: 'Add GROQ_API_KEY to Vercel environment variables'
          }, { status: 400 });
        }
        return NextResponse.json({ status: 'ok', message: 'Groq API key configured' });

      case 'huggingface':
        if (!process.env.HUGGINGFACE_API_KEY) {
          return NextResponse.json({ 
            error: 'HUGGINGFACE_API_KEY not configured',
            instructions: 'Add HUGGINGFACE_API_KEY to Vercel environment variables'
          }, { status: 400 });
        }
        return NextResponse.json({ status: 'ok', message: 'Hugging Face API key configured' });

      case 'elevenlabs':
        if (!process.env.ELEVENLABS_API_KEY) {
          return NextResponse.json({ 
            error: 'ELEVENLABS_API_KEY not configured',
            instructions: 'Add ELEVENLABS_API_KEY to Vercel environment variables'
          }, { status: 400 });
        }
        return NextResponse.json({ status: 'ok', message: 'ElevenLabs API key configured' });

      default:
        return NextResponse.json({ error: 'Unknown service' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
