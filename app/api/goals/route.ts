// HOLLY Goals & Projects API
// TODO: Reimplement with Prisma after goals library migration

import { NextRequest, NextResponse } from 'next/server';

const NOT_IMPLEMENTED = {
  error: 'Goals features temporarily disabled during database migration',
  status: 'not_implemented'
};

export async function POST(req: NextRequest) {
  return NextResponse.json(NOT_IMPLEMENTED, { status: 503 });
}

export async function GET(req: NextRequest) {
  return NextResponse.json(NOT_IMPLEMENTED, { status: 503 });
}
