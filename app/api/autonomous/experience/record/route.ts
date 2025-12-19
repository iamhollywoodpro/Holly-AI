// PHASE 1: REAL Experience Recording
// Stores experiences in HollyExperience table
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { experience, category, learnings, userId, context } = await req.json();

    if (!experience || !userId) {
      return NextResponse.json(
        { success: false, error: 'experience and userId required' },
        { status: 400 }
      );
    }

    // Store in database
    const experienceRecord = await prisma.hollyExperience.create({
      data: {
        userId,
        type: category || 'general',
        content: { experience, context: context || {} },
        lessons: learnings || [],
        significance: 0.5, // Default medium significance
        emotionalImpact: 0.5,
        emotionalValence: 0,
        relatedConcepts: [],
        futureImplications: [],
        createdAt: new Date()
      }
    });

    const result = {
      success: true,
      experienceId: experienceRecord.id,
      recorded: true,
      category: experienceRecord.type,
      learnings: experienceRecord.lessons,
      timestamp: experienceRecord.createdAt.toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Experience recording error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
