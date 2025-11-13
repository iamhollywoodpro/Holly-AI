/**
 * Health Check API
 * Returns system status and configuration
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      clerk: {
        configured: !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
        status: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'configured' : 'missing_keys'
      },
      database: {
        configured: !!process.env.DATABASE_URL,
        status: process.env.DATABASE_URL ? 'configured' : 'missing_connection'
      },
      ai: {
        groq: {
          available: !!process.env.GROQ_API_KEY,
          status: process.env.GROQ_API_KEY ? 'configured' : 'missing_key'
        },
        openai: {
          available: !!process.env.OPENAI_API_KEY,
          status: process.env.OPENAI_API_KEY ? 'configured' : 'missing_key'
        },
        anthropic: {
          available: !!process.env.ANTHROPIC_API_KEY,
          status: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing_key'
        },
        google: {
          available: !!process.env.GOOGLE_API_KEY,
          status: process.env.GOOGLE_API_KEY ? 'configured' : 'missing_key'
        }
      },
      voice: {
        elevenlabs: {
          available: !!process.env.ELEVENLABS_API_KEY,
          voices: ['rachel', 'bella', 'elli', 'grace'],
          status: process.env.ELEVENLABS_API_KEY ? 'configured' : 'missing_key'
        }
      },
      storage: {
        blob: {
          available: !!process.env.BLOB_READ_WRITE_TOKEN,
          status: process.env.BLOB_READ_WRITE_TOKEN ? 'configured' : 'missing_token'
        }
      }
    },
    warnings: [] as string[],
    errors: [] as string[]
  };

  // Check for critical missing services
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    health.errors.push('Clerk authentication not configured');
    health.status = 'unhealthy';
  }

  if (!process.env.DATABASE_URL) {
    health.errors.push('Database connection not configured');
    health.status = 'unhealthy';
  }

  // Check for warnings
  if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    health.warnings.push('No AI provider configured - Chat will not work');
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    health.warnings.push('ELEVENLABS_API_KEY not configured - Voice synthesis unavailable');
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    health.warnings.push('BLOB_READ_WRITE_TOKEN not configured - File uploads unavailable');
  }

  // Set overall status
  if (health.errors.length > 0) {
    health.status = 'unhealthy';
  } else if (health.warnings.length > 0) {
    health.status = 'degraded';
  }

  return NextResponse.json(health);
}
