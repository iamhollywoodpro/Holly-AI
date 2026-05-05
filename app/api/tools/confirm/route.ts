import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { request_id, approved, tool_name, action } = body;

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.hollyExperience.create({
      data: {
        userId: user.id,
        type: 'tool_confirmation',
        content: { request_id, approved, tool_name, action },
        significance: 0.6,
        lessons: [approved ? `Approved ${tool_name}` : `Denied ${tool_name}`],
        relatedConcepts: ['tool-use'],
        futureImplications: [],
        emotionalImpact: 0.3,
        timestamp: new Date()
      }
    });

    return NextResponse.json({ success: true, request_id, approved });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
