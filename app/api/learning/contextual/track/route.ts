import { NextRequest, NextResponse } from 'next/server';

const NOT_IMPLEMENTED = {
  error: 'Learning features temporarily disabled - rebuilding with Clerk + Prisma',
  status: 'not_implemented'
};

export async function POST(req: NextRequest) {
  return NextResponse.json(NOT_IMPLEMENTED, { status: 503 });
}

export async function GET(req: NextRequest) {
  return NextResponse.json(NOT_IMPLEMENTED, { status: 503 });
}
