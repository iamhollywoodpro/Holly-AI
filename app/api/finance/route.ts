// HOLLY Feature 46: Financial Intelligence - API Routes
// TODO: Reimplement with Prisma after finance library migration

import { NextRequest, NextResponse } from 'next/server';

const NOT_IMPLEMENTED = {
  error: 'Finance features temporarily disabled during Supabase → Prisma migration',
  status: 'not_implemented'
};

export async function POST(req: NextRequest) {
  return NextResponse.json(NOT_IMPLEMENTED, { status: 503 });
}

export async function GET(req: NextRequest) {
  return NextResponse.json(NOT_IMPLEMENTED, { status: 503 });
}
