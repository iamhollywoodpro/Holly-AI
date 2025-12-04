import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// PUBLIC endpoint - no auth required
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {} as Record<string, { status: string; message?: string }>,
  };

  // Check 1: Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = { status: 'healthy' };
  } catch (error) {
    checks.status = 'degraded';
    checks.services.database = { 
      status: 'unhealthy', 
      message: error instanceof Error ? error.message : 'Database connection failed' 
    };
  }

  // Check 2: Environment Variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'HUGGINGFACE_API_KEY',
    'BLOB_READ_WRITE_TOKEN',
    'GITHUB_TOKEN',
  ];

  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missingEnvVars.length > 0) {
    checks.status = 'degraded';
    checks.services.environment = {
      status: 'degraded',
      message: `Missing: ${missingEnvVars.join(', ')}`,
    };
  } else {
    checks.services.environment = { status: 'healthy' };
  }

  // Check 3: HuggingFace API (quick test)
  try {
    const hfResponse = await fetch('https://api-inference.huggingface.co/models', {
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      },
    });
    
    if (hfResponse.ok) {
      checks.services.huggingface = { status: 'healthy' };
    } else {
      checks.status = 'degraded';
      checks.services.huggingface = { 
        status: 'unhealthy', 
        message: `HuggingFace API returned ${hfResponse.status}` 
      };
    }
  } catch (error) {
    checks.status = 'degraded';
    checks.services.huggingface = { 
      status: 'unhealthy', 
      message: 'HuggingFace API unreachable' 
    };
  }

  // Determine HTTP status code
  const httpStatus = checks.status === 'healthy' ? 200 : 503;

  return NextResponse.json(checks, { status: httpStatus });
}
