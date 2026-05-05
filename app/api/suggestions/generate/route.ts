import { NextResponse } from 'next/server'; export async function POST() { return NextResponse.json({ suggestions: [] }); }

export const runtime = 'nodejs';

